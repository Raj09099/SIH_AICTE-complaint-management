"""
Resolution Evidence Checker API Routes for SIH26264 AICTE Complaint Intelligence.
Handles Feature 3:
- PyMuPDF text and metadata parsing from uploaded compliance documents (PDF/DOCX/TXT)
- Thematic relevance scoring and discrepancy audit against student complaints
- Human review confirmation and resolution enforcement
- Prevention of fraudulent complaint closures without verified evidence
"""

from datetime import datetime, timezone
from decimal import Decimal
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_active_user, get_db
from app.ml.evidence_checker import ResolutionEvidenceChecker
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.resolution_evidence import ResolutionEvidence
from app.models.user import User
from app.schemas.evidence import (
    EvidenceComplaintCandidate,
    EvidenceListItem,
    EvidenceRelevanceBreakdown,
    EvidenceReviewRequest,
    EvidenceUploadResponse,
)
from app.services.reminder_service import ReminderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/evidence", tags=["Evidence Checker"])

EVIDENCE_UPLOAD_DIR = Path("uploads/evidence")
EVIDENCE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

evidence_checker = ResolutionEvidenceChecker()


def _build_evidence_response(evidence: ResolutionEvidence, complaint: Complaint) -> EvidenceUploadResponse:
    """Helper to convert ORM model to response DTO."""
    bd = evidence.relevance_breakdown or {}
    rel_score = float(evidence.relevance_score) if evidence.relevance_score is not None else 0.0

    breakdown_dto = EvidenceRelevanceBreakdown(
        total_score=float(bd.get("total_score", rel_score * 100.0)),
        percentage=int(bd.get("percentage", round(rel_score * 100))),
        risk_level=bd.get("risk_level", "Medium"),
        recommendation=bd.get("recommendation", "Needs Review"),
        recommendation_code=bd.get("recommendation_code", "SCRUTINIZE_RECOMMENDED"),
        score_components=bd.get("score_components", []),
        checklist=bd.get("checklist", []),
        entity_matches=bd.get("entity_matches", []),
        warnings=bd.get("warnings", []),
        matched_keywords=bd.get("matched_keywords", []),
        missing_elements=bd.get("missing_elements", []),
        all_elements_present=bd.get("all_elements_present", False),
        is_scanned_pdf=bd.get("is_scanned_pdf", False),
        requires_ocr=bd.get("requires_ocr", False),
        word_count=bd.get("word_count", 0),
        page_count=bd.get("page_count", 1),
        summary=bd.get("summary", ""),
        authenticity_disclaimer=bd.get(
            "authenticity_disclaimer",
            "Verification Intelligence Notice: Document text analysis provides decision support. "
            "It does not legally certify financial transaction execution, document authenticity, "
            "or banking settlement. Official AICTE officer review is mandatory before complaint closure.",
        ),
    )

    reviewer_name = None
    if evidence.reviewer:
        reviewer_name = evidence.reviewer.full_name

    return EvidenceUploadResponse(
        id=evidence.id,
        complaint_id=evidence.complaint_id,
        complaint_no=complaint.complaint_no if complaint else f"CMP-{evidence.complaint_id}",
        filename=evidence.filename,
        file_size_bytes=evidence.file_size_bytes or 0,
        mime_type=evidence.mime_type or "application/pdf",
        extracted_text=evidence.extracted_text or "",
        relevance_score=rel_score,
        relevance_breakdown=breakdown_dto,
        human_verified=bool(evidence.human_verified),
        reviewer_decision=evidence.reviewer_decision,
        verification_notes=evidence.verification_notes,
        reviewed_by=evidence.reviewed_by,
        reviewer_name=reviewer_name,
        created_at=evidence.created_at.isoformat() if evidence.created_at else None,
    )


@router.get(
    "/candidates",
    response_model=List[EvidenceComplaintCandidate],
    summary="List candidate complaints available for evidence inspection",
)
def get_evidence_complaint_candidates(
    search: Optional[str] = Query(None, description="Search by complaint_no, category, or institution name"),
    status_filter: Optional[str] = Query(None, description="Filter by status (e.g., 'Under Review', 'Evidence Requested')"),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[EvidenceComplaintCandidate]:
    """
    Returns complaints for the Resolution Evidence Checker selector.
    """
    query = (
        db.query(Complaint)
        .options(joinedload(Complaint.institution))
    )

    if status_filter and status_filter.lower() != "all":
        query = query.filter(Complaint.status.ilike(status_filter.strip()))

    if search:
        s = f"%{search.strip()}%"
        query = query.join(Institution, isouter=True).filter(
            (Complaint.complaint_no.ilike(s))
            | (Complaint.subject.ilike(s))
            | (Complaint.category.ilike(s))
            | (Institution.name.ilike(s))
        )

    complaints = query.order_by(Complaint.filing_date.desc().nullslast()).limit(limit).all()

    candidates: List[EvidenceComplaintCandidate] = []
    for c in complaints:
        ev_count = db.query(func.count(ResolutionEvidence.id)).filter(
            ResolutionEvidence.complaint_id == c.id
        ).scalar() or 0

        inst_name = c.institution.name if c.institution else f"Institution #{c.institution_id}"
        candidates.append(
            EvidenceComplaintCandidate(
                id=c.id,
                complaint_no=c.complaint_no,
                category=c.category,
                bureau=c.bureau,
                subject=c.subject,
                description=c.description[:300] if c.description else "",
                institution_id=c.institution_id,
                institution_name=inst_name,
                status=c.status or "New",
                filing_date=c.filing_date.isoformat() if c.filing_date else None,
                evidence_count=ev_count,
            )
        )

    return candidates


@router.post(
    "/upload-and-verify",
    response_model=EvidenceUploadResponse,
    summary="Upload compliance proof document (PDF/DOCX), parse with PyMuPDF, and compute relevance",
)
def upload_and_verify_evidence(
    file: UploadFile = File(...),
    complaint_id: int = Form(...),
    officer_notes: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> EvidenceUploadResponse:
    """
    Uploads supporting resolution document (PDF, DOCX, TXT):
    1. Validates referenced complaint exists.
    2. Stores file securely on server disk.
    3. Extracts text and metadata using PyMuPDF parser.
    4. Evaluates contextual relevance, matched keywords, and resolution checklists.
    5. Saves ResolutionEvidence audit record.
    """
    complaint = (
        db.query(Complaint)
        .options(joinedload(Complaint.institution))
        .filter(Complaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint ID #{complaint_id} was not found.",
        )

    content = file.file.read()
    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # 25MB file size limit
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowable limit of 25MB.",
        )

    # Generate secure unique storage path
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in [".pdf", ".docx", ".doc", ".txt", ".rtf", ".odt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF, DOCX, or TXT documents.",
        )

    unique_filename = f"evid_{complaint.id}_{uuid.uuid4().hex[:8]}_{Path(file.filename).name}"
    saved_file_path = EVIDENCE_UPLOAD_DIR / unique_filename

    with open(saved_file_path, "wb") as f_out:
        f_out.write(content)

    # 1. Parse text using PyMuPDF / docx parser
    try:
        extraction_result = evidence_checker.extract_text_from_document(content, file.filename)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("Document parsing error for %s: %s", file.filename, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse document: {exc}",
        )

    extracted_text = extraction_result.get("text", "")
    is_scanned = extraction_result.get("is_scanned", False)
    requires_ocr = extraction_result.get("requires_ocr", False)

    # 2. Evaluate relevance against the complaint grievance statement
    complaint_dict = {
        "complaint_no": complaint.complaint_no,
        "subject": complaint.subject,
        "translated_subject": complaint.translated_subject,
        "description": complaint.description,
        "translated_description": complaint.translated_description,
        "category": complaint.category,
        "bureau": complaint.bureau,
        "institution_name": complaint.institution.name if complaint.institution else "",
        "resolution_summary": complaint.resolution_summary,
    }

    relevance_breakdown = evidence_checker.evaluate_relevance(
        complaint_dict,
        extracted_text,
        is_scanned=is_scanned,
        requires_ocr=requires_ocr,
    )

    # 3. Create database record
    total_score = relevance_breakdown.get("total_score", 0.0)
    rel_score_dec = Decimal(str(round(total_score / 100.0, 4)))
    evidence = ResolutionEvidence(
        complaint_id=complaint.id,
        filename=file.filename,
        file_path=str(saved_file_path),
        file_size_bytes=len(content),
        mime_type=file.content_type or "application/pdf",
        extracted_text=extracted_text[:100000],  # store up to 100k characters of text
        relevance_score=rel_score_dec,
        relevance_breakdown=relevance_breakdown,
        human_verified=False,
        verification_notes=officer_notes,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return _build_evidence_response(evidence, complaint)


@router.get(
    "/complaint/{complaint_id}",
    response_model=List[EvidenceUploadResponse],
    summary="Retrieve all resolution evidence files uploaded for a complaint",
)
def get_evidence_by_complaint(
    complaint_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[EvidenceUploadResponse]:
    """
    Returns all evidence verification records for a specific complaint.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID #{complaint_id} was not found.",
        )

    evidences = (
        db.query(ResolutionEvidence)
        .options(joinedload(ResolutionEvidence.reviewer))
        .filter(ResolutionEvidence.complaint_id == complaint_id)
        .order_by(ResolutionEvidence.created_at.desc().nullslast())
        .all()
    )

    return [_build_evidence_response(ev, complaint) for ev in evidences]


@router.get(
    "/{evidence_id}",
    response_model=EvidenceUploadResponse,
    summary="Get detailed verification dossier for a specific evidence item",
)
def get_evidence_detail(
    evidence_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> EvidenceUploadResponse:
    evidence = (
        db.query(ResolutionEvidence)
        .options(joinedload(ResolutionEvidence.complaint), joinedload(ResolutionEvidence.reviewer))
        .filter(ResolutionEvidence.id == evidence_id)
        .first()
    )
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence record #{evidence_id} was not found.",
        )

    return _build_evidence_response(evidence, evidence.complaint)


@router.post(
    "/{evidence_id}/review",
    response_model=EvidenceUploadResponse,
    summary="Record AICTE officer human review confirmation and update case resolution state",
)
def review_evidence(
    evidence_id: int,
    req: EvidenceReviewRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> EvidenceUploadResponse:
    """
    Applies human reviewer judgment:
    - 'approved': Validates resolution, marks case as 'Resolved', records narrative.
    - 'rejected': Flags evidence as insufficient/invalid, keeps case under review or 'Evidence Requested'.
    - 'more_info_needed': Asks college for supplementary documents.
    """
    evidence = (
        db.query(ResolutionEvidence)
        .options(joinedload(ResolutionEvidence.complaint))
        .filter(ResolutionEvidence.id == evidence_id)
        .first()
    )
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence record #{evidence_id} was not found.",
        )

    complaint = evidence.complaint
    user_id = current_user.get("id")

    evidence.human_verified = True
    evidence.reviewer_decision = req.decision
    evidence.verification_notes = req.verification_notes or evidence.verification_notes
    evidence.reviewed_by = user_id

    # If officer approved the resolution evidence, resolve the complaint
    if req.decision == "approved":
        complaint.status = "Resolved"
        if req.resolution_summary:
            complaint.resolution_summary = req.resolution_summary.strip()
        elif req.verification_notes:
            complaint.resolution_summary = req.verification_notes.strip()

        # Emit notification to the institution
        try:
            ReminderService.create_complaint_status_notification(
                db=db,
                complaint=complaint,
                status_change="Resolved",
            )
        except Exception as e:
            logger.warning("Could not dispatch status notification for resolved complaint: %s", e)

    elif req.decision == "rejected":
        complaint.status = "Evidence Requested"
        try:
            ReminderService.create_complaint_status_notification(
                db=db,
                complaint=complaint,
                status_change="Evidence Requested",
            )
        except Exception as e:
            logger.warning("Could not dispatch status notification for rejected evidence: %s", e)

    db.commit()
    db.refresh(evidence)

    return _build_evidence_response(evidence, complaint)


@router.get(
    "/document/{evidence_id}/download",
    summary="Download the original uploaded evidence document",
)
def download_evidence_file(
    evidence_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    evidence = db.query(ResolutionEvidence).filter(ResolutionEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence document #{evidence_id} not found.",
        )

    file_path = Path(evidence.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File asset is missing on server disk.",
        )

    return FileResponse(
        path=str(file_path),
        filename=evidence.filename,
        media_type=evidence.mime_type or "application/pdf",
    )
