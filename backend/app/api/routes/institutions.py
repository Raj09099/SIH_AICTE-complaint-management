"""
Technical Institutions directory and profile API routes for SIH26264 AICTE Complaint Intelligence.
Provides searchable registry, complaint telemetry aggregation, and individual institution dossiers.
"""

from datetime import date
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.case_overlap import CaseOverlap
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.schemas.institution import (
    InstitutionComplaintItem,
    InstitutionDetailOut,
    InstitutionListResponse,
    InstitutionOut,
    InstitutionSummaryStats,
)

router = APIRouter(prefix="/institutions", tags=["Institutions"])


def _find_institution(identifier: str, db: Session) -> Optional[Institution]:
    """Helper to locate an institution by database integer ID or AICTE permanent ID."""
    inst = None
    if identifier.isdigit():
        inst = db.query(Institution).filter(Institution.id == int(identifier)).first()
    if not inst:
        inst = db.query(Institution).filter(Institution.aicte_id == identifier).first()
    return inst


@router.get(
    "/",
    response_model=InstitutionListResponse,
    summary="List approved technical institutions with complaint metrics and filters",
)
@router.get(
    "",
    response_model=InstitutionListResponse,
    include_in_schema=False,
)
def list_institutions(
    skip: int = Query(0, ge=0, description="Records to skip for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Records per page"),
    search: Optional[str] = Query(None, description="Search by name, AICTE ID, or city"),
    state: Optional[str] = Query(None, description="Filter by Indian State/UT"),
    institution_type: Optional[str] = Query(None, description="Filter by technical institution type"),
    bureau: Optional[str] = Query(None, description="Filter by bureau jurisdiction"),
    include_stats: bool = Query(True, description="Compute council-wide summary telemetry"),
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user),
) -> InstitutionListResponse:
    """
    Search and filter AICTE approved technical institutions.
    Aggregates open, resolved, and overdue complaint counts using a single batch SQL query.
    """
    query = db.query(Institution)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Institution.name.ilike(search_pattern),
                Institution.aicte_id.ilike(search_pattern),
                Institution.city.ilike(search_pattern),
            )
        )

    if state and state.lower() != "all":
        query = query.filter(Institution.state.ilike(state.strip()))

    if institution_type and institution_type.lower() != "all":
        query = query.filter(Institution.institution_type.ilike(institution_type.strip()))

    if bureau and bureau.lower() != "all":
        query = query.filter(Institution.bureau_jurisdiction.ilike(bureau.strip()))

    total_count = query.count()
    institutions = query.order_by(Institution.name.asc()).offset(skip).limit(limit).all()

    # Batch compute complaint statistics for fetched institutions (avoids N+1 queries)
    inst_ids = [inst.id for inst in institutions]
    complaint_stats: Dict[int, Dict[str, int]] = {}

    if inst_ids:
        today = date.today()
        # Single aggregate query grouped by institution_id
        agg_rows = (
            db.query(
                Complaint.institution_id,
                func.count(Complaint.id).label("total"),
                func.count(case((Complaint.status != "Resolved", 1))).label("open"),
                func.count(case((Complaint.status == "Resolved", 1))).label("resolved"),
                func.count(
                    case(
                        (
                            (Complaint.status != "Resolved")
                            & (Complaint.deadline_date.isnot(None))
                            & (Complaint.deadline_date < today),
                            1,
                        )
                    )
                ).label("overdue"),
            )
            .filter(Complaint.institution_id.in_(inst_ids))
            .group_by(Complaint.institution_id)
            .all()
        )

        for row in agg_rows:
            complaint_stats[row[0]] = {
                "total": row[1] or 0,
                "open": row[2] or 0,
                "resolved": row[3] or 0,
                "overdue": row[4] or 0,
            }

    items: List[InstitutionOut] = []
    for inst in institutions:
        st = complaint_stats.get(inst.id, {"total": 0, "open": 0, "resolved": 0, "overdue": 0})
        items.append(
            InstitutionOut(
                id=inst.id,
                aicte_id=inst.aicte_id,
                name=inst.name,
                state=inst.state,
                city=inst.city,
                address=inst.address,
                institution_type=inst.institution_type or "Technical Institute",
                affiliating_university=inst.affiliating_university,
                established_year=inst.established_year,
                bureau_jurisdiction=inst.bureau_jurisdiction,
                is_active=inst.is_active if inst.is_active is not None else True,
                total_complaints=st["total"],
                open_complaints=st["open"],
                resolved_complaints=st["resolved"],
                overdue_complaints=st["overdue"],
            )
        )

    # Optional Council-wide summary stats for directory KPI cards
    summary_stats = None
    if include_stats:
        today = date.today()
        total_inst = db.query(func.count(Institution.id)).scalar() or 0
        total_comp = db.query(func.count(Complaint.id)).scalar() or 0
        open_comp = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.status != "Resolved")
            .scalar()
            or 0
        )
        resolved_comp = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.status == "Resolved")
            .scalar()
            or 0
        )
        overdue_comp = (
            db.query(func.count(Complaint.id))
            .filter(
                Complaint.status != "Resolved",
                Complaint.deadline_date.isnot(None),
                Complaint.deadline_date < today,
            )
            .scalar()
            or 0
        )
        summary_stats = InstitutionSummaryStats(
            total_institutions=total_inst,
            total_complaints=total_comp,
            open_complaints=open_comp,
            overdue_complaints=overdue_comp,
            resolved_complaints=resolved_comp,
        )

    return InstitutionListResponse(
        items=items,
        total=total_count,
        skip=skip,
        limit=limit,
        stats=summary_stats,
    )


@router.get(
    "/{identifier}",
    response_model=InstitutionDetailOut,
    summary="Fetch comprehensive institution profile and grievance history dossier",
)
def get_institution_details(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user),
) -> InstitutionDetailOut:
    """
    Fetch institution profile, complaints history, and bureau cases.
    Supports lookup by integer database ID or official AICTE Permanent ID (e.g. 1-INST-01).
    """
    inst = _find_institution(identifier, db)
    if not inst:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Institution with identifier '{identifier}' was not found in the AICTE directory.",
        )

    # Fetch complaints filed against this institution
    complaints = (
        db.query(Complaint)
        .filter(Complaint.institution_id == inst.id)
        .order_by(Complaint.filing_date.desc().nullslast(), Complaint.id.desc())
        .all()
    )

    today = date.today()
    total_count = len(complaints)
    open_count = sum(1 for c in complaints if c.status != "Resolved")
    resolved_count = sum(1 for c in complaints if c.status == "Resolved")
    overdue_count = sum(
        1
        for c in complaints
        if c.status != "Resolved" and c.deadline_date is not None and c.deadline_date < today
    )

    # Aggregate active bureaus and categories
    bureau_set = set()
    category_counts: Dict[str, int] = {}
    complaint_items: List[InstitutionComplaintItem] = []

    complaint_ids = []
    for c in complaints:
        complaint_ids.append(c.id)
        if c.bureau:
            bureau_set.add(c.bureau)
        cat = c.category or "General"
        category_counts[cat] = category_counts.get(cat, 0) + 1

        complaint_items.append(
            InstitutionComplaintItem(
                id=c.id,
                complaint_no=c.complaint_no,
                bureau=c.bureau,
                category=c.category,
                subject=c.subject,
                priority=c.priority or "Medium",
                status=c.status or "New",
                filing_date=c.filing_date,
                deadline_date=c.deadline_date,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )

    # Count overlaps involving complaints of this institution
    overlap_count = 0
    if complaint_ids:
        try:
            overlap_count = (
                db.query(func.count(CaseOverlap.id))
                .filter(
                    or_(
                        CaseOverlap.primary_complaint_id.in_(complaint_ids),
                        CaseOverlap.related_complaint_id.in_(complaint_ids),
                    )
                )
                .scalar()
                or 0
            )
        except Exception:
            overlap_count = 0

    return InstitutionDetailOut(
        id=inst.id,
        aicte_id=inst.aicte_id,
        name=inst.name,
        state=inst.state,
        city=inst.city,
        address=inst.address,
        institution_type=inst.institution_type or "Technical Institute",
        affiliating_university=inst.affiliating_university,
        established_year=inst.established_year,
        bureau_jurisdiction=inst.bureau_jurisdiction,
        is_active=inst.is_active if inst.is_active is not None else True,
        total_complaints=total_count,
        open_complaints=open_count,
        resolved_complaints=resolved_count,
        overdue_complaints=overdue_count,
        complaints=complaint_items,
        active_bureaus=sorted(list(bureau_set)),
        category_distribution=category_counts,
        related_overlaps_count=overlap_count,
    )
