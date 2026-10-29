"""
API routes for Feature 2: Multi-Institution Problem Pattern Detector.
Provides on-demand grievance clustering, systemic issue discovery, and filtering across
technical institutions under AICTE jurisdiction.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db, require_roles
from app.ml.pattern_detector import ProblemPatternDetector
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.schemas.pattern import (
    PatternDiscoveryRequest,
    PatternListResponse,
    ProblemPatternOut,
)

router = APIRouter(prefix="/patterns", tags=["Problem Patterns"])


def _discover_patterns_from_db(
    db: Session,
    threshold: float,
    min_institutions: int,
    min_complaints: int,
    category: Optional[str] = None,
    bureau: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50,
) -> PatternListResponse:
    """
    Queries complaint and institution records from the database and runs the ML
    pattern detector pipeline on demand. Does not mutate database records.
    """
    try:
        query = db.query(Complaint).options(joinedload(Complaint.institution))

        if category and category.strip().lower() != "all":
            query = query.filter(Complaint.category.ilike(f"%{category.strip()}%"))

        if bureau and bureau.strip().lower() != "all":
            query = query.filter(Complaint.bureau.ilike(f"%{bureau.strip()}%"))

        complaints = query.all()

        # Build lookup map of institutions
        institutions = db.query(Institution).all()
        inst_map = {inst.id: inst for inst in institutions}

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while querying complaints for pattern discovery: {str(exc)}",
        )

    detector = ProblemPatternDetector(
        default_threshold=threshold,
        min_institutions=min_institutions,
        min_complaints=min_complaints,
    )

    patterns = detector.discover_patterns(
        complaints=complaints,
        institutions_map=inst_map,
        threshold=threshold,
        min_institutions=min_institutions,
        min_complaints=min_complaints,
        category_filter=category if (category and category.strip().lower() != "all") else None,
        bureau_filter=bureau if (bureau and bureau.strip().lower() != "all") else None,
        state_filter=state if (state and state.strip().lower() != "all") else None,
        limit=limit,
    )

    # Collect total distinct institutions affected across all discovered patterns
    all_affected_inst_ids = set()
    for p in patterns:
        for ai in p.get("affected_institutions", []):
            all_affected_inst_ids.add(ai["id"])

    return PatternListResponse(
        total=len(patterns),
        threshold=threshold,
        min_institutions=min_institutions,
        total_complaints_analyzed=len(complaints),
        total_distinct_institutions_affected=len(all_affected_inst_ids),
        patterns=patterns,
    )


@router.get("", response_model=PatternListResponse)
@router.get("/", response_model=PatternListResponse)
def list_problem_patterns(
    threshold: float = Query(
        0.25,
        ge=0.10,
        le=0.95,
        description="Cosine similarity threshold for complaint clustering",
    ),
    min_institutions: int = Query(
        2,
        ge=2,
        description="Minimum distinct institutions required per pattern",
    ),
    min_complaints: int = Query(
        2,
        ge=2,
        description="Minimum complaint count per pattern",
    ),
    category: Optional[str] = Query(None, description="Filter by grievance category"),
    bureau: Optional[str] = Query(None, description="Filter by AICTE bureau"),
    state: Optional[str] = Query(None, description="Filter by institution state"),
    limit: int = Query(50, ge=1, le=200, description="Maximum patterns to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer", "viewer")),
) -> PatternListResponse:
    """
    Feature 2: Multi-Institution Problem Pattern Detector.
    Discovers recurring grievance themes across technical institutions under AICTE jurisdiction.
    Requires an authenticated active user (Viewer, Officer, Bureau Head, or Admin).
    """
    return _discover_patterns_from_db(
        db=db,
        threshold=threshold,
        min_institutions=min_institutions,
        min_complaints=min_complaints,
        category=category,
        bureau=bureau,
        state=state,
        limit=limit,
    )


@router.post("/run-clustering", response_model=PatternListResponse)
@router.post("/detect", response_model=PatternListResponse)
def trigger_pattern_clustering(
    payload: PatternDiscoveryRequest = PatternDiscoveryRequest(),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer")),
) -> PatternListResponse:
    """
    Triggers on-demand unsupervised clustering pipeline across complaints.
    Requires authorized officer role ('admin', 'bureau_head', 'officer').
    """
    return _discover_patterns_from_db(
        db=db,
        threshold=payload.threshold,
        min_institutions=payload.min_institutions,
        min_complaints=payload.min_complaints,
        category=payload.category,
        bureau=payload.bureau,
        state=payload.state,
        limit=payload.limit,
    )


@router.get("/{pattern_code}", response_model=ProblemPatternOut)
def get_pattern_by_code(
    pattern_code: str,
    threshold: float = Query(0.25, ge=0.10, le=0.95),
    min_institutions: int = Query(2, ge=2),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer", "viewer")),
) -> ProblemPatternOut:
    """
    Fetches detailed breakdown for a specific pattern code by running the discovery pipeline
    or resolving the pattern identifier.
    """
    result = _discover_patterns_from_db(
        db=db,
        threshold=threshold,
        min_institutions=min_institutions,
        min_complaints=2,
        limit=100,
    )

    for p in result.patterns:
        if p.pattern_code.upper() == pattern_code.upper().strip():
            return p

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Problem pattern '{pattern_code}' not found with the specified clustering threshold.",
    )
