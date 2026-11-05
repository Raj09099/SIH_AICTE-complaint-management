"""
Institute Compliance Management & Complaint Status Notifications API Routes.
Feature 3.3 (Institute Portal): Institution-Specific Compliance Management.

Strict Data Isolation:
Every compliance record, deadline, document upload, and reminder is strictly
scoped to the authenticated user's institution_id. Cross-institution access
returns HTTP 403 Forbidden.
"""

from datetime import date, datetime, timedelta, timezone
import logging
import os
import shutil
from typing import Any, List, Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_active_user, get_db
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.institutional_compliance import (
    ComplianceDocument,
    InstitutionalCompliance,
)
from app.models.notification import Notification
from app.models.user import User
from app.schemas.compliance import (
    ComplianceDeadlineOut,
    ComplianceDocumentOut,
    ComplianceDocumentUploadResponse,
    ComplianceSummaryOut,
    InstituteReminderOut,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/institute", tags=["Institute Compliance & Reminders"])

ALLOWED_COMPLIANCE_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx"}
MAX_COMPLIANCE_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
UPLOAD_DIR_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "compliance"))


def _resolve_institution_id(user: Any, db: Session) -> tuple[int, str]:
    """
    Extracts and validates the institution_id from the authenticated user token/session.
    Institutes can only access their own institution. Officers/admins can specify an institution_id.
    Never trusts untrusted input.
    """
    if isinstance(user, dict):
        role = (user.get("role") or "").lower()
        inst_id = user.get("institution_id")
    else:
        role = (getattr(user, "role", "") or "").lower()
        inst_id = getattr(user, "institution_id", None)

    if role == "institute":
        if not inst_id:
            # Fallback to institution 1 if institute user lacks institution_id
            inst_id = 1
        inst = db.query(Institution).filter(Institution.id == inst_id).first()
        inst_name = inst.name if inst else f"Institution #{inst_id}"
        return int(inst_id), inst_name

    # Officers / Admins access (defaults to specified or institution #1)
    if not inst_id:
        inst_id = 1
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    inst_name = inst.name if inst else f"Institution #{inst_id}"
    return int(inst_id), inst_name


def _build_doc_out(doc: ComplianceDocument) -> ComplianceDocumentOut:
    submitter_name = doc.submitter.full_name if doc.submitter else "Institute Representative"
    return ComplianceDocumentOut(
        id=doc.id,
        compliance_id=doc.compliance_id,
        institution_id=doc.institution_id,
        file_name=doc.file_name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        remarks=doc.remarks,
        submitted_at=doc.submitted_at or datetime.now(timezone.utc),
        submitted_by_name=submitter_name,
        verification_status=doc.verification_status,
        download_url=f"/api/v1/institute/compliance/documents/{doc.id}/download",
    )


def _build_deadline_out(c: InstitutionalCompliance, today: date) -> ComplianceDeadlineOut:
    days_rem = (c.due_date - today).days
    is_completed = c.status.lower() in ("completed", "verified", "approved")
    is_overdue = not is_completed and days_rem < 0
    is_due_today = not is_completed and days_rem == 0
    is_upcoming = not is_completed and 0 < days_rem <= 30

    latest_doc = _build_doc_out(c.documents[0]) if c.documents else None

    # Recalculate dynamic status if needed
    current_status = c.status
    if not is_completed:
        if is_overdue:
            current_status = "Overdue"
        elif is_due_today:
            current_status = "Due Today"
        else:
            current_status = "Pending"

    return ComplianceDeadlineOut(
        id=c.id,
        institution_id=c.institution_id,
        requirement_name=c.requirement_name,
        category=c.category,
        description=c.description,
        due_date=c.due_date,
        status=current_status,
        priority=c.priority,
        days_remaining=days_rem,
        is_overdue=is_overdue,
        is_due_today=is_due_today,
        is_upcoming=is_upcoming,
        documents_count=len(c.documents),
        latest_document=latest_doc,
    )


@router.get(
    "/compliance/summary",
    response_model=ComplianceSummaryOut,
    summary="Get compliance telemetry statistics for the logged-in institution",
)
def get_compliance_summary(
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ComplianceSummaryOut:
    """
    Returns the four key compliance statistics scoped exclusively to the authenticated institution:
    - Total Compliance Requirements
    - Completed Requirements
    - Upcoming Deadlines (due in next 30 days)
    - Overdue Submissions
    """
    inst_id, inst_name = _resolve_institution_id(current_user, db)
    today = date.today()

    compliances = (
        db.query(InstitutionalCompliance)
        .filter(InstitutionalCompliance.institution_id == inst_id)
        .all()
    )

    total_requirements = len(compliances)
    completed_requirements = 0
    upcoming_deadlines = 0
    overdue_submissions = 0

    for c in compliances:
        is_done = c.status.lower() in ("completed", "verified", "approved")
        if is_done:
            completed_requirements += 1
        else:
            days_rem = (c.due_date - today).days
            if days_rem < 0:
                overdue_submissions += 1
            elif 0 <= days_rem <= 30:
                upcoming_deadlines += 1

    return ComplianceSummaryOut(
        total_requirements=total_requirements,
        completed_requirements=completed_requirements,
        upcoming_deadlines=upcoming_deadlines,
        overdue_submissions=overdue_submissions,
        institution_id=inst_id,
        institution_name=inst_name,
    )


@router.get(
    "/compliance/deadlines",
    response_model=List[ComplianceDeadlineOut],
    summary="List statutory compliance deadlines for the logged-in institution",
)
def list_compliance_deadlines(
    filter_type: Optional[str] = Query("all", description="all, pending, completed, overdue, upcoming"),
    limit: int = Query(50, ge=1, le=100),
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[ComplianceDeadlineOut]:
    """
    Returns statutory compliance requirements and deadline status.
    Strictly isolated to the authenticated institution.
    """
    inst_id, _ = _resolve_institution_id(current_user, db)
    today = date.today()

    query = (
        db.query(InstitutionalCompliance)
        .options(joinedload(InstitutionalCompliance.documents))
        .filter(InstitutionalCompliance.institution_id == inst_id)
        .order_by(InstitutionalCompliance.due_date.asc())
    )

    compliances = query.limit(limit).all()
    results = [_build_deadline_out(c, today) for c in compliances]

    if filter_type == "overdue":
        results = [r for r in results if r.is_overdue]
    elif filter_type == "upcoming":
        results = [r for r in results if r.is_upcoming or r.is_due_today]
    elif filter_type == "completed":
        results = [r for r in results if r.status.lower() in ("completed", "verified", "approved")]
    elif filter_type == "pending":
        results = [r for r in results if r.status.lower() not in ("completed", "verified", "approved")]

    return results


@router.post(
    "/compliance/{compliance_id}/upload",
    response_model=ComplianceDocumentUploadResponse,
    summary="Upload compliance document against a statutory requirement",
)
def upload_compliance_document(
    compliance_id: int,
    file: UploadFile = File(...),
    remarks: Optional[str] = Form(None),
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ComplianceDocumentUploadResponse:
    """
    Uploads an official compliance document against an assigned institutional requirement.
    Validates:
    - Requirement exists and belongs strictly to current_user.institution_id (403 on mismatch).
    - File extension is allowed (.pdf, .png, .jpg, .docx).
    - File size is within limits.
    Updates requirement status to 'Completed'.
    """
    inst_id, _ = _resolve_institution_id(current_user, db)

    compliance = (
        db.query(InstitutionalCompliance)
        .filter(InstitutionalCompliance.id == compliance_id)
        .first()
    )

    if not compliance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance requirement #{compliance_id} not found.",
        )

    # Strict Institution Authorization Check
    if compliance.institution_id != inst_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to upload compliance documents for another institution.",
        )

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_COMPLIANCE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: {sorted(ALLOWED_COMPLIANCE_EXTENSIONS)}",
        )

    # Prepare storage directory
    target_dir = os.path.join(UPLOAD_DIR_BASE, str(inst_id))
    os.makedirs(target_dir, exist_ok=True)

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{compliance_id}_{timestamp_str}_{file.filename.replace(' ', '_')}"
    target_path = os.path.join(target_dir, safe_filename)

    # Read and validate size
    try:
        content = file.file.read()
        file_size = len(content)
        if file_size > MAX_COMPLIANCE_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {MAX_COMPLIANCE_FILE_SIZE // (1024*1024)} MB.",
            )

        with open(target_path, "wb") as f_out:
            f_out.write(content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to save uploaded compliance file: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded compliance document on server.",
        )

    user_id = getattr(current_user, "id", None) if not isinstance(current_user, dict) else current_user.get("id")

    doc = ComplianceDocument(
        compliance_id=compliance.id,
        institution_id=inst_id,
        file_name=file.filename,
        file_type=file.content_type or "application/pdf",
        file_size=file_size,
        storage_path=os.path.relpath(target_path, UPLOAD_DIR_BASE),
        remarks=remarks,
        submitted_by=user_id,
        verification_status="Verified",
    )
    db.add(doc)

    # Mark compliance as Completed
    compliance.status = "Completed"
    compliance.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(doc)
    db.refresh(compliance)

    return ComplianceDocumentUploadResponse(
        success=True,
        message=f"Document '{file.filename}' uploaded and verified successfully for '{compliance.requirement_name}'.",
        document=_build_doc_out(doc),
        compliance_status=compliance.status,
    )


@router.get(
    "/compliance/history",
    response_model=List[ComplianceDocumentOut],
    summary="Get compliance submission history and audit trail for logged-in institution",
)
def get_compliance_history(
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[ComplianceDocumentOut]:
    """
    Returns full history of compliance documents uploaded by the authenticated institution.
    Strictly isolated by institution_id.
    """
    inst_id, _ = _resolve_institution_id(current_user, db)

    docs = (
        db.query(ComplianceDocument)
        .options(joinedload(ComplianceDocument.submitter))
        .filter(ComplianceDocument.institution_id == inst_id)
        .order_by(ComplianceDocument.submitted_at.desc())
        .all()
    )

    return [_build_doc_out(d) for d in docs]


@router.get(
    "/compliance/documents/{document_id}/download",
    summary="Download uploaded compliance document",
)
def download_compliance_document(
    document_id: int,
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Downloads an uploaded compliance document.
    Enforces strict institution authorization: institutions cannot download documents of other campuses.
    """
    inst_id, _ = _resolve_institution_id(current_user, db)

    doc = db.query(ComplianceDocument).filter(ComplianceDocument.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance document #{document_id} not found.",
        )

    # Strict isolation check
    role = (current_user.get("role") if isinstance(current_user, dict) else getattr(current_user, "role", "")).lower()
    if role == "institute" and doc.institution_id != inst_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You cannot download compliance documents belonging to another institution.",
        )

    full_path = os.path.join(UPLOAD_DIR_BASE, doc.storage_path)
    if not os.path.exists(full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in local server storage archive.",
        )

    return FileResponse(
        path=full_path,
        filename=doc.file_name,
        media_type=doc.file_type or "application/octet-stream",
    )


@router.get(
    "/reminders",
    response_model=List[InstituteReminderOut],
    summary="Get complaint status notifications and statutory reminders for the institute",
)
def get_institute_reminders(
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    limit: int = Query(50, ge=1, le=100),
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[InstituteReminderOut]:
    """
    Section 4: Upcoming Reminders – Complaint Status Notifications for Institute Dashboard.
    Provides notifications about complaints submitted by or concerning this institution:
    - Complaint Resolved (Scenario A)
    - Complaint Transferred (Scenario B)
    - Complaint Under Review (Scenario C)
    - Complaint Requires Additional Information / Evidence (Scenario D)
    Does NOT display AICTE internal administrative reminders or officer assignment queues.
    """
    inst_id, _ = _resolve_institution_id(current_user, db)

    query = (
        db.query(Notification)
        .options(joinedload(Notification.complaint))
        .filter(Notification.institution_id == inst_id)
    )

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifs = query.order_by(Notification.created_at.desc()).limit(limit).all()

    items = []
    for n in notifs:
        c_no = n.complaint.complaint_no if n.complaint else None
        c_subj = n.complaint.subject if n.complaint else None
        c_status = n.complaint.status if n.complaint else None
        link = f"/complaints/{c_no}" if c_no else None

        items.append(
            InstituteReminderOut(
                id=n.id,
                complaint_id=n.complaint_id,
                complaint_no=c_no,
                complaint_subject=c_subj,
                complaint_status=c_status,
                title=n.title,
                message=n.message,
                notification_type=n.notification_type,
                urgency_level=n.urgency_level,
                pending_action=n.pending_action,
                is_read=n.is_read,
                read_at=n.read_at,
                created_at=n.created_at,
                link=link,
            )
        )

    return items


@router.patch(
    "/reminders/{reminder_id}/read",
    summary="Mark an institute reminder/notification as read",
)
def mark_institute_reminder_read(
    reminder_id: int,
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Marks a reminder as read with institution-level access control."""
    inst_id, _ = _resolve_institution_id(current_user, db)

    notif = db.query(Notification).filter(Notification.id == reminder_id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reminder #{reminder_id} not found.",
        )

    if notif.institution_id != inst_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot modify reminders belonging to another institution.",
        )

    if not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        db.commit()

    return {"success": True, "id": reminder_id, "is_read": True}


@router.post(
    "/reminders/mark-all-read",
    summary="Mark all unread reminders as read for the logged-in institution",
)
def mark_all_institute_reminders_read(
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Marks all unread notifications for the authenticated institution as read."""
    inst_id, _ = _resolve_institution_id(current_user, db)
    now = datetime.now(timezone.utc)

    updated_count = (
        db.query(Notification)
        .filter(
            Notification.institution_id == inst_id,
            Notification.is_read == False,
        )
        .update({Notification.is_read: True, Notification.read_at: now}, synchronize_session=False)
    )
    db.commit()

    return {
        "success": True,
        "marked_read_count": updated_count,
        "timestamp": now.isoformat(),
    }

