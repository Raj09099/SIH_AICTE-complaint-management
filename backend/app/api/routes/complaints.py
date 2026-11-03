from pydantic import BaseModel
from app.services.translation_service import TranslationService
"""
Complaints management API routes for SIH26264 AICTE Complaint Intelligence.
Provides end-to-end lifecycle operations:
- GET /api/v1/complaints/ (list with filters)
- POST /api/v1/complaints/ (create with validation)
- GET /api/v1/complaints/{identifier} (fetch by id or complaint_no)
- PATCH /api/v1/complaints/{identifier}/status (status transition & transfer)
- PATCH /api/v1/complaints/{identifier} (general update)
"""

from datetime import date, datetime, timedelta, timezone
import logging
import os
from pathlib import Path
import re
import shutil
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status as http_status
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies import get_current_user, get_db, require_roles
from app.models.attachment import Attachment
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.user import User
from app.schemas.attachment import AttachmentOut
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintStatusUpdate,
    ComplaintUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/complaints", tags=["Complaints"])

VALID_STATUSES = {
    "New",
    "Under Review",
    "Transferred",
    "Evidence Requested",
    "Escalated",
    "Resolved",
}

VALID_PRIORITIES = {
    "Low",
    "Medium",
    "High",
    "Urgent",
    "Critical",
}


def _find_complaint_by_identifier(identifier: str, db: Session) -> Optional[Complaint]:
    """Helper to locate a complaint by either database integer ID or complaint_no."""
    complaint = None
    if identifier.isdigit():
        complaint = db.query(Complaint).filter(Complaint.id == int(identifier)).first()
    if not complaint:
        complaint = (
            db.query(Complaint).filter(Complaint.complaint_no == identifier).first()
        )
    return complaint


ALLOWED_ATTACHMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}
MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB per file
MAX_ATTACHMENTS_PER_REQUEST = 5


def _build_attachment_out(att: Attachment) -> AttachmentOut:
    """Helper to convert ORM Attachment to AttachmentOut with download URL."""
    return AttachmentOut(
        id=att.id,
        complaint_id=att.complaint_id,
        file_name=att.file_name,
        file_type=att.file_type,
        file_size=att.file_size,
        storage_path=att.storage_path,
        label=att.label or "Supporting Evidence",
        uploaded_by=att.uploaded_by,
        uploaded_at=att.uploaded_at,
        download_url=f"/api/v1/complaints/{att.complaint_id}/attachments/{att.id}/file",
    )


def _populate_complaint_out(complaint: Complaint) -> ComplaintOut:
    """Helper to ensure attachments and download URLs are populated on ComplaintOut."""
    out = ComplaintOut.model_validate(complaint)
    if hasattr(complaint, "attachments") and complaint.attachments:
        out.attachments = [_build_attachment_out(att) for att in complaint.attachments]
    else:
        out.attachments = []
    return out


@router.get(
    "/",
    response_model=List[ComplaintOut],
    summary="List complaint records with optional filtering",
)
@router.get(
    "",
    response_model=List[ComplaintOut],
    include_in_schema=False,
)
def list_complaints(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max number of records to return"),
    bureau: Optional[str] = Query(None, description="Filter by AICTE bureau / cell"),
    status: Optional[str] = Query(None, description="Filter by complaint lifecycle status"),
    category: Optional[str] = Query(None, description="Filter by grievance category"),
    priority: Optional[str] = Query(None, description="Filter by priority level"),
    institution_id: Optional[int] = Query(None, description="Filter by institution ID"),
    is_escalated: Optional[bool] = Query(None, description="Filter by escalation status"),
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user),
) -> List[ComplaintOut]:
    """
    List complaints with optional query filters (bureau, status, category, priority, institution, escalation).
    Institutes are strictly scoped to their own institution_id on the backend.
    """
    try:
        query = db.query(Complaint)

        # STRICT BACKEND SECURITY: Institute users can ONLY query their own college's complaints
        if current_user and current_user.get("role") == "institute":
            inst_id = current_user.get("institution_id")
            if inst_id is not None:
                query = query.filter(Complaint.institution_id == inst_id)
            else:
                # Institute account with no linked institution sees empty list
                return []
        elif institution_id is not None:
            query = query.filter(Complaint.institution_id == institution_id)

        if bureau is not None:
            query = query.filter(Complaint.bureau == bureau)
        if status is not None:
            query = query.filter(Complaint.status == status)
        if category is not None:
            query = query.filter(Complaint.category == category)
        if priority is not None:
            query = query.filter(Complaint.priority == priority)
        if is_escalated is not None:
            query = query.filter(Complaint.is_escalated == is_escalated)

        complaints = (
            query.order_by(Complaint.created_at.desc(), Complaint.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [_populate_complaint_out(c) for c in complaints]
    except SQLAlchemyError as exc:
        logger.error(f"Database error while querying complaints: {exc}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while fetching complaints.",
        )


@router.post(
    "/",
    response_model=ComplaintOut,
    status_code=http_status.HTTP_201_CREATED,
    summary="Create and persist a new complaint record",
)
@router.post(
    "",
    response_model=ComplaintOut,
    status_code=http_status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer", "institute")),
) -> ComplaintOut:
    """
    Register a new grievance case in the AICTE grievance registry with validation and persistence:
    - Auto-enforces institution_id from logged-in institute user
    - Verifies that referenced institution exists
    - Validates status and priority against recognized council enums
    - Auto-generates unique tracking complaint_no if omitted
    - Sets initial statutory SLA deadline if not explicitly provided
    """
    # 0. If current user is an institute representative, lock institution_id to their profile
    if current_user and current_user.get("role") == "institute":
        inst_id = current_user.get("institution_id")
        if inst_id is not None:
            payload.institution_id = inst_id

    # 1. Validate institution foreign key
    inst = db.query(Institution).filter(Institution.id == payload.institution_id).first()
    if not inst:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Referenced institution ID {payload.institution_id} does not exist.",
        )

    # 2. Validate assigned officer user if provided
    if payload.assigned_to is not None:
        user = db.query(User).filter(User.id == payload.assigned_to).first()
        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Assigned officer user ID {payload.assigned_to} does not exist.",
            )

    # 3. Validate status and priority
    status_val = payload.status or "New"
    if status_val not in VALID_STATUSES:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{status_val}'. Allowed values: {sorted(VALID_STATUSES)}",
        )

    priority_val = payload.priority or "Medium"
    if priority_val not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid priority '{priority_val}'. Allowed values: {sorted(VALID_PRIORITIES)}",
        )

    # 4. Resolve unique tracking complaint_no
    complaint_no = payload.complaint_no
    if complaint_no:
        complaint_no = complaint_no.strip()
        existing = db.query(Complaint).filter(Complaint.complaint_no == complaint_no).first()
        if existing:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Complaint with number '{complaint_no}' already exists.",
            )
    else:
        # Generate official AICTE tracking number format: AICTE-YYYY-XXXX
        complaint_no = f"AICTE-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"

    # 5. Default SLA deadline: 30 days statutory turnaround if not provided
    filing_date_val = date.today()
    deadline_date_val = payload.deadline_date or (filing_date_val + timedelta(days=30))

    try:
        # Feature 3.6: Multilingual processing and translation for AI analysis
        multi_info = TranslationService.process_complaint_multilingual(
            subject=payload.subject.strip(),
            description=payload.description.strip(),
            preferred_lang=payload.detected_language,
        )

        new_complaint = Complaint(
            complaint_no=complaint_no,
            institution_id=payload.institution_id,
            complainant_type=payload.complainant_type.strip(),
            bureau=payload.bureau.strip(),
            category=payload.category.strip(),
            subject=payload.subject.strip(),
            description=payload.description.strip(),
            priority=priority_val,
            status=status_val,
            incident_date=payload.incident_date,
            filing_date=filing_date_val,
            deadline_date=deadline_date_val,
            assigned_to=payload.assigned_to,
            resolution_summary=payload.resolution_summary,
            is_escalated=payload.is_escalated or False,
            detected_language=multi_info["detected_language"],
            translated_subject=multi_info["translated_subject"],
            translated_description=multi_info["translated_description"],
            translation_status=multi_info["translation_status"],
            translation_provider=multi_info["translation_provider"],
            translated_at=multi_info["translated_at"],
        )
        db.add(new_complaint)
        db.commit()
        db.refresh(new_complaint)

        logger.info(
            "Complaint %s created successfully for institution %s (Actor: %s)",
            complaint_no,
            payload.institution_id,
            current_user.get("sub") if current_user else "unauthenticated",
        )
        return _populate_complaint_out(new_complaint)
    except IntegrityError as exc:
        db.rollback()
        logger.error("Integrity error persisting complaint %s: %s", complaint_no, exc)
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Database constraint violation creating complaint '{complaint_no}'.",
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error persisting complaint %s: %s", complaint_no, exc)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist complaint due to an internal database error.",
        )


@router.get(
    "/{identifier}",
    response_model=ComplaintOut,
    summary="Fetch complaint details by integer ID or complaint tracking number",
)
def get_complaint_details(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user),
) -> ComplaintOut:
    """
    Fetch comprehensive case file metadata by either numeric database ID or official tracking number.
    Strictly forbids institute users from accessing complaints of other institutions (returns 403).
    """
    complaint = _find_complaint_by_identifier(identifier, db)
    if not complaint:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint record '{identifier}' not found in registry.",
        )

    # BACKEND SECURITY CHECK: Institute users can only inspect complaints belonging to their own college
    if current_user and current_user.get("role") == "institute":
        inst_id = current_user.get("institution_id")
        if inst_id is not None and complaint.institution_id != inst_id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view complaints filed against other institutions.",
            )

    return _populate_complaint_out(complaint)


# ==============================================================================
# ATTACHMENTS & SUPPORTING EVIDENCE MANAGEMENT
# ==============================================================================

@router.post(
    "/{identifier}/attachments",
    response_model=List[AttachmentOut],
    status_code=http_status.HTTP_201_CREATED,
    summary="Upload supporting documents and evidence files for a complaint",
)
async def upload_complaint_attachments(
    identifier: str,
    files: List[UploadFile] = File(...),
    labels: Optional[List[str]] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer", "institute")),
) -> List[AttachmentOut]:
    """
    Upload official grievance documents (e.g. Complaint Letter, Supporting Evidence, Audit Proofs).
    Validates file formats (PDF, JPG, PNG, DOCX), enforces 10 MB per file, max 5 files.
    """
    complaint = _find_complaint_by_identifier(identifier, db)
    if not complaint:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint record '{identifier}' not found.",
        )

    # Authorization check for institute role
    if current_user.get("role") == "institute":
        inst_id = current_user.get("institution_id")
        if inst_id is not None and complaint.institution_id != inst_id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot attach documents to complaints of another institution.",
            )

    if not files:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="No files were uploaded.",
        )

    if len(files) > MAX_ATTACHMENTS_PER_REQUEST:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Too many files uploaded. Maximum of {MAX_ATTACHMENTS_PER_REQUEST} files allowed per submission.",
        )

    # Storage destination directory: UPLOAD_DIR/complaint-attachments/{complaint_id}
    target_dir = Path(settings.UPLOAD_DIR) / "complaint-attachments" / str(complaint.id)
    target_dir.mkdir(parents=True, exist_ok=True)

    saved_attachments: List[Attachment] = []

    for idx, upload_file in enumerate(files):
        original_name = upload_file.filename or f"attachment_{idx + 1}"
        ext = os.path.splitext(original_name)[1].lower()

        if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type for '{original_name}'. Allowed extensions are: PDF, JPG, PNG, DOCX.",
            )

        # Read content and enforce size constraint
        content = await upload_file.read()
        file_size = len(content)

        if file_size > MAX_ATTACHMENT_SIZE_BYTES:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"File '{original_name}' ({round(file_size / (1024 * 1024), 2)} MB) exceeds the 10 MB limit.",
            )

        if file_size == 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"File '{original_name}' is empty (0 bytes).",
            )

        # Sanitize filename
        safe_name = re.sub(r"[^a-zA-Z0-9_\.-]", "_", original_name)
        storage_filename = f"{uuid.uuid4().hex[:8]}_{safe_name}"
        storage_file_path = target_dir / storage_filename

        with open(storage_file_path, "wb") as f_out:
            f_out.write(content)

        # Resolve label
        file_label = "Supporting Evidence"
        if labels and idx < len(labels) and labels[idx]:
            file_label = labels[idx].strip()

        # Content type determination
        file_type = upload_file.content_type or "application/octet-stream"

        attachment_record = Attachment(
            complaint_id=complaint.id,
            file_name=original_name,
            file_type=file_type,
            file_size=file_size,
            storage_path=str(storage_file_path),
            label=file_label,
            uploaded_by=current_user.get("id"),
        )
        db.add(attachment_record)
        saved_attachments.append(attachment_record)

    try:
        db.commit()
        for att in saved_attachments:
            db.refresh(att)
        logger.info(
            "Uploaded %d attachment(s) for complaint %s by %s",
            len(saved_attachments),
            complaint.complaint_no,
            current_user.get("sub"),
        )
        return [_build_attachment_out(att) for att in saved_attachments]
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Failed to commit attachments for complaint %s: %s", complaint.complaint_no, exc)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while saving attachment records.",
        )


@router.get(
    "/{identifier}/attachments",
    response_model=List[AttachmentOut],
    summary="List all attachments and documents associated with a complaint",
)
def list_complaint_attachments(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user),
) -> List[AttachmentOut]:
    """
    Retrieve all document attachments linked to a complaint.
    Institute users can only access attachments of their own college's complaints.
    """
    complaint = _find_complaint_by_identifier(identifier, db)
    if not complaint:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint record '{identifier}' not found.",
        )

    if current_user and current_user.get("role") == "institute":
        inst_id = current_user.get("institution_id")
        if inst_id is not None and complaint.institution_id != inst_id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot view attachments of other institutions' complaints.",
            )

    attachments = (
        db.query(Attachment)
        .filter(Attachment.complaint_id == complaint.id)
        .order_by(Attachment.uploaded_at.asc())
        .all()
    )
    return [_build_attachment_out(att) for att in attachments]


@router.get(
    "/{identifier}/attachments/{attachment_id}/file",
    summary="Download or stream an attachment file with permission enforcement",
)
def download_complaint_attachment(
    identifier: str,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user),
):
    """
    Stream attachment file content. Enforces institute access controls.
    """
    complaint = _find_complaint_by_identifier(identifier, db)
    if not complaint:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint record '{identifier}' not found.",
        )

    if current_user and current_user.get("role") == "institute":
        inst_id = current_user.get("institution_id")
        if inst_id is not None and complaint.institution_id != inst_id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot download attachments of other institutions.",
            )

    attachment = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.complaint_id == complaint.id)
        .first()
    )
    if not attachment:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Attachment #{attachment_id} not found on complaint '{identifier}'.",
        )

    file_path = Path(attachment.storage_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Attachment file was not found on local storage.",
        )

    return FileResponse(
        path=str(file_path),
        filename=attachment.file_name,
        media_type=attachment.file_type or "application/octet-stream",
    )


@router.patch(
    "/{identifier}/status",
    response_model=ComplaintOut,
    summary="Transition complaint lifecycle status, resolution summary, or bureau transfer",
)
def update_complaint_status(
    identifier: str,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer")),
) -> ComplaintOut:
    """
    Update complaint lifecycle status (e.g. Under Review, Evidence Requested, Escalated, Resolved),
    reassign bureau jurisdiction (transfer), assign officer, or attach official resolution notes.
    """
    complaint = _find_complaint_by_identifier(identifier, db)
    if not complaint:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint record '{identifier}' not found.",
        )

    # Validate status if provided
    if payload.status is not None:
        if payload.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status '{payload.status}'. Allowed values: {sorted(VALID_STATUSES)}",
            )
        complaint.status = payload.status

    # Validate priority if provided
    if payload.priority is not None:
        if payload.priority not in VALID_PRIORITIES:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid priority '{payload.priority}'. Allowed values: {sorted(VALID_PRIORITIES)}",
            )
        complaint.priority = payload.priority

    # Validate assigned officer if provided
    if payload.assigned_to is not None:
        user = db.query(User).filter(User.id == payload.assigned_to).first()
        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Assigned officer user ID {payload.assigned_to} does not exist.",
            )
        complaint.assigned_to = payload.assigned_to

    # Bureau transfer
    if payload.bureau is not None and payload.bureau.strip():
        complaint.bureau = payload.bureau.strip()

    # Resolution summary
    if payload.resolution_summary is not None:
        complaint.resolution_summary = payload.resolution_summary

    # Escalation
    if payload.is_escalated is not None:
        complaint.is_escalated = payload.is_escalated

    complaint.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(complaint)
        logger.info(
            "Complaint %s status updated to '%s' (Actor: %s)",
            complaint.complaint_no,
            complaint.status,
            current_user.get("sub") if current_user else "unauthenticated",
        )
        return complaint
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error updating complaint %s: %s", identifier, exc)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update complaint due to an internal database error.",
        )


@router.patch(
    "/{identifier}",
    response_model=ComplaintOut,
    summary="Update complaint fields (priority, assignment, bureau, SLA deadline, status)",
)
def update_complaint(
    identifier: str,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer")),
) -> ComplaintOut:
    """
    General update endpoint for complaint records.
    """
    status_update = ComplaintStatusUpdate(
        status=payload.status,
        resolution_summary=payload.resolution_summary,
        assigned_to=payload.assigned_to,
        bureau=payload.bureau,
        priority=payload.priority,
        is_escalated=payload.is_escalated,
    )
    complaint = _find_complaint_by_identifier(identifier, db)
    if not complaint:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint record '{identifier}' not found.",
        )

    if payload.deadline_date is not None:
        complaint.deadline_date = payload.deadline_date

    return update_complaint_status(identifier, status_update, db, current_user)


class ComplaintTranslateRequest(BaseModel):
    target_language: Optional[str] = "en"


class ComplaintTranslateResponse(BaseModel):
    complaint_id: int
    complaint_no: str
    detected_language: str
    target_language: str
    original_subject: str
    original_description: str
    translated_subject: str
    translated_description: str
    translation_status: str
    translation_provider: str


@router.post(
    "/{identifier}/translate",
    response_model=ComplaintTranslateResponse,
    summary="On-demand translation of complaint narrative and subject (Feature 3.6)",
)
def translate_complaint_content(
    identifier: str,
    payload: Optional[ComplaintTranslateRequest] = None,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user),
) -> ComplaintTranslateResponse:
    """
    On-demand translation endpoint for AICTE complaint narratives (Feature 3.6).
    Translates Indic complaints to normalized English representation while preserving original text.
    """
    complaint = _find_complaint_by_identifier(identifier, db)
    if not complaint:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint record '{identifier}' not found.",
        )

    # Institute authorization check
    if current_user and current_user.get("role") == "institute":
        inst_id = current_user.get("institution_id")
        if inst_id is not None and complaint.institution_id != inst_id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Institute accounts are not authorized to access records belonging to other institutions.",
            )

    target_lang = payload.target_language if payload else "en"

    multi_info = TranslationService.process_complaint_multilingual(
        subject=complaint.subject,
        description=complaint.description,
        preferred_lang=complaint.detected_language,
    )

    if not complaint.translated_subject or not complaint.translated_description:
        complaint.detected_language = multi_info["detected_language"]
        complaint.translated_subject = multi_info["translated_subject"]
        complaint.translated_description = multi_info["translated_description"]
        complaint.translation_status = multi_info["translation_status"]
        complaint.translation_provider = multi_info["translation_provider"]
        complaint.translated_at = multi_info["translated_at"]
        db.commit()
        db.refresh(complaint)

    return ComplaintTranslateResponse(
        complaint_id=complaint.id,
        complaint_no=complaint.complaint_no,
        detected_language=complaint.detected_language or multi_info["detected_language"] or "en",
        target_language=target_lang,
        original_subject=complaint.subject,
        original_description=complaint.description,
        translated_subject=complaint.translated_subject or multi_info["translated_subject"] or complaint.subject,
        translated_description=complaint.translated_description or multi_info["translated_description"] or complaint.description,
        translation_status=complaint.translation_status or "translated",
        translation_provider=complaint.translation_provider or "internal_indic",
    )
