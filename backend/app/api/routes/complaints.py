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
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_roles
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.user import User
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
) -> List[ComplaintOut]:
    """
    List complaints with optional query filters (bureau, status, category, priority, institution, escalation).
    Returns an empty list `[]` if no matching complaints exist in the database.
    """
    try:
        query = db.query(Complaint)

        if bureau is not None:
            query = query.filter(Complaint.bureau == bureau)
        if status is not None:
            query = query.filter(Complaint.status == status)
        if category is not None:
            query = query.filter(Complaint.category == category)
        if priority is not None:
            query = query.filter(Complaint.priority == priority)
        if institution_id is not None:
            query = query.filter(Complaint.institution_id == institution_id)
        if is_escalated is not None:
            query = query.filter(Complaint.is_escalated == is_escalated)

        complaints = (
            query.order_by(Complaint.created_at.desc(), Complaint.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return complaints
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
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer")),
) -> ComplaintOut:
    """
    Register a new grievance case in the AICTE grievance registry with validation and persistence:
    - Verifies that referenced institution exists
    - Validates status and priority against recognized council enums
    - Auto-generates unique tracking complaint_no if omitted
    - Sets initial statutory SLA deadline if not explicitly provided
    """
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
        return new_complaint
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
) -> ComplaintOut:
    """
    Fetch comprehensive case file metadata by either numeric database ID or official tracking number (e.g. 'AICTE-2026-0001').
    """
    complaint = _find_complaint_by_identifier(identifier, db)
    if not complaint:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint record '{identifier}' not found in registry.",
        )
    return complaint


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
