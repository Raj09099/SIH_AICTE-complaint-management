"""
Case Overlap and Relationship Detection API routes for SIH26264 AICTE Complaint Intelligence.
Provides ML similarity detection, cross-bureau matching, and reviewer determination workflows.
"""

from datetime import datetime, timezone
from decimal import Decimal
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db, require_roles
from app.ml.overlap_detector import ComplaintOverlapDetector
from app.models.case_overlap import CaseOverlap
from app.models.complaint import Complaint
from app.models.user import User
from app.schemas.overlap import (
    CaseOverlapOut,
    OverlapDetectRequest,
    OverlapDetectResponse,
    OverlapReviewRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/overlap", tags=["Case Overlap"])

VALID_DECISIONS = {
    "duplicate": "Duplicate",
    "related": "Related",
    "unrelated": "Unrelated",
    "confirmed linked": "Confirmed Linked",
    "confirmed": "Confirmed Linked",
    "dismissed": "Dismissed",
    "flagged": "Flagged",
}


@router.post(
    "/detect",
    response_model=OverlapDetectResponse,
    summary="Run TF-IDF cosine similarity analysis across complaint registry",
)
def detect_overlaps(
    request: OverlapDetectRequest = OverlapDetectRequest(),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer")),
) -> OverlapDetectResponse:
    """
    Feature 1: Smart Case Relationship & Overlap Detection.
    Compares complaint texts, institution identifiers, categories, and bureaus
    using scikit-learn TF-IDF and Cosine Similarity to detect duplicates and cross-bureau cases.
    Persists detected flagged pairs into case_overlaps table if persist=True.
    """
    threshold = request.threshold or 0.60
    limit = request.limit or 50

    try:
        # If complaint_id is provided, evaluate that specific complaint against candidate pool
        if request.complaint_id:
            target = (
                db.query(Complaint)
                .filter(Complaint.id == request.complaint_id)
                .first()
            )
            if not target:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail=f"Target complaint ID {request.complaint_id} not found.",
                )
            candidates = (
                db.query(Complaint)
                .filter(Complaint.id != request.complaint_id)
                .all()
            )
            detector = ComplaintOverlapDetector(default_threshold=threshold)
            detected_raw = []
            for c in candidates:
                pair = detector.compare_pair(target, c, threshold=threshold)
                if pair:
                    detected_raw.append(pair)
            detected_raw.sort(key=lambda x: x["similarity_score"], reverse=True)
            detected_raw = detected_raw[:limit]
        else:
            # Full pool batch detection
            complaints = db.query(Complaint).order_by(Complaint.id.asc()).limit(300).all()
            detector = ComplaintOverlapDetector(default_threshold=threshold)
            detected_raw = detector.detect_all_overlaps(
                complaints, threshold=threshold, limit=limit
            )

        persisted_records: List[CaseOverlap] = []

        if request.persist:
            for item in detected_raw:
                p_id = item["primary_complaint_id"]
                r_id = item["related_complaint_id"]

                # Ensure canonical pair ordering and duplicate check
                existing = (
                    db.query(CaseOverlap)
                    .filter(
                        or_(
                            (CaseOverlap.primary_complaint_id == p_id)
                            & (CaseOverlap.related_complaint_id == r_id),
                            (CaseOverlap.primary_complaint_id == r_id)
                            & (CaseOverlap.related_complaint_id == p_id),
                        )
                    )
                    .first()
                )

                if existing:
                    # Update similarity and keywords if higher confidence
                    existing.similarity_score = item["similarity_score"]
                    existing.overlap_type = item["overlap_type"]
                    existing.reason = item["reason"]
                    existing.matching_keywords = item["matching_keywords"]
                    persisted_records.append(existing)
                else:
                    new_overlap = CaseOverlap(
                        primary_complaint_id=p_id,
                        related_complaint_id=r_id,
                        similarity_score=item["similarity_score"],
                        overlap_type=item["overlap_type"],
                        reason=item["reason"],
                        matching_keywords=item["matching_keywords"],
                        status="Flagged",
                    )
                    db.add(new_overlap)
                    persisted_records.append(new_overlap)

            db.commit()

            # Refresh and eagerly load complaint relations
            persisted_ids = [r.id for r in persisted_records if r.id is not None]
            final_pairs = (
                db.query(CaseOverlap)
                .options(
                    joinedload(CaseOverlap.primary_complaint),
                    joinedload(CaseOverlap.related_complaint),
                )
                .filter(CaseOverlap.id.in_(persisted_ids))
                .order_by(CaseOverlap.similarity_score.desc())
                .all()
            )
        else:
            # Dry-run: construct non-persisted output
            final_pairs = []
            for item in detected_raw:
                p_comp = db.query(Complaint).filter(Complaint.id == item["primary_complaint_id"]).first()
                r_comp = db.query(Complaint).filter(Complaint.id == item["related_complaint_id"]).first()
                obj = CaseOverlap(
                    id=0,
                    primary_complaint_id=item["primary_complaint_id"],
                    related_complaint_id=item["related_complaint_id"],
                    similarity_score=item["similarity_score"],
                    overlap_type=item["overlap_type"],
                    reason=item["reason"],
                    matching_keywords=item["matching_keywords"],
                    status="Flagged",
                )
                obj.primary_complaint = p_comp
                obj.related_complaint = r_comp
                final_pairs.append(obj)

        logger.info(
            "Overlap detection complete: %d detected, %d persisted (Threshold: %.2f)",
            len(detected_raw),
            len(persisted_records),
            threshold,
        )

        return OverlapDetectResponse(
            detected_count=len(detected_raw),
            persisted_count=len(persisted_records),
            threshold_used=threshold,
            pairs=final_pairs,
        )

    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error during overlap detection: %s", exc)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to run overlap detection due to an internal database error.",
        )


@router.get(
    "/flagged",
    response_model=List[CaseOverlapOut],
    summary="Retrieve flagged case overlaps awaiting human reviewer determination",
)
@router.get(
    "/",
    response_model=List[CaseOverlapOut],
    summary="List all recorded case overlaps with optional status and similarity filtering",
)
def list_overlaps(
    status: Optional[str] = Query(None, description="Filter by status (e.g. Flagged, Duplicate, Related, Unrelated)"),
    min_similarity: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum similarity filter"),
    skip: int = Query(0, ge=0, description="Offset"),
    limit: int = Query(50, ge=1, le=200, description="Limit"),
    db: Session = Depends(get_db),
) -> List[CaseOverlapOut]:
    """
    Retrieve detected case overlaps with full primary and related complaint metadata.
    """
    try:
        query = (
            db.query(CaseOverlap)
            .options(
                joinedload(CaseOverlap.primary_complaint),
                joinedload(CaseOverlap.related_complaint),
            )
        )

        if status is not None:
            norm_status = status.strip().lower()
            if norm_status in VALID_DECISIONS:
                query = query.filter(CaseOverlap.status == VALID_DECISIONS[norm_status])
            else:
                query = query.filter(CaseOverlap.status == status)

        if min_similarity is not None:
            query = query.filter(CaseOverlap.similarity_score >= Decimal(str(min_similarity)))

        overlaps = (
            query.order_by(CaseOverlap.similarity_score.desc(), CaseOverlap.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return overlaps

    except SQLAlchemyError as exc:
        logger.error("Database error listing overlaps: %s", exc)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while fetching case overlaps.",
        )


@router.get(
    "/{overlap_id}",
    response_model=CaseOverlapOut,
    summary="Get details of a specific case overlap pair",
)
def get_overlap_details(
    overlap_id: int,
    db: Session = Depends(get_db),
) -> CaseOverlapOut:
    """
    Retrieve single overlap pair details with full dossiers of both complaints.
    """
    overlap = (
        db.query(CaseOverlap)
        .options(
            joinedload(CaseOverlap.primary_complaint),
            joinedload(CaseOverlap.related_complaint),
        )
        .filter(CaseOverlap.id == overlap_id)
        .first()
    )
    if not overlap:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Case overlap pair with ID {overlap_id} not found.",
        )
    return overlap


@router.patch(
    "/{overlap_id}/review",
    response_model=CaseOverlapOut,
    summary="Record authorized human reviewer determination (Duplicate, Related, or Unrelated)",
)
@router.post(
    "/{overlap_id}/review",
    response_model=CaseOverlapOut,
    include_in_schema=False,
)
def review_overlap_determination(
    overlap_id: int,
    payload: OverlapReviewRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "bureau_head", "officer")),
) -> CaseOverlapOut:
    """
    Requirement 8: Allow authorized human reviewers to mark a suggested relationship
    as Duplicate, Related, or Unrelated. Never let the algorithm make the final binding decision automatically.
    """
    overlap = (
        db.query(CaseOverlap)
        .options(
            joinedload(CaseOverlap.primary_complaint),
            joinedload(CaseOverlap.related_complaint),
        )
        .filter(CaseOverlap.id == overlap_id)
        .first()
    )
    if not overlap:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Case overlap pair with ID {overlap_id} not found.",
        )

    norm_decision = payload.decision.strip().lower()
    if norm_decision not in VALID_DECISIONS:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reviewer decision '{payload.decision}'. Allowed decisions: ['Duplicate', 'Related', 'Unrelated', 'Confirmed Linked', 'Dismissed']",
        )

    canonical_status = VALID_DECISIONS[norm_decision]
    overlap.status = canonical_status
    overlap.reviewed_at = datetime.now(timezone.utc)

    # Requirement 4: Never trust a user ID supplied by the frontend for reviewer identity.
    # Derive the actor strictly from the authenticated active user.
    reviewer_user_id = current_user.get("id")
    if reviewer_user_id:
        overlap.reviewed_by = reviewer_user_id
    else:
        auth_email = current_user.get("email") or current_user.get("sub")
        if auth_email:
            matched_user = db.query(User).filter(User.email == auth_email).first()
            if matched_user:
                overlap.reviewed_by = matched_user.id

    if payload.notes:
        existing_reason = overlap.reason or ""
        overlap.reason = f"{existing_reason} [Reviewer Determination: {canonical_status} - {payload.notes.strip()}]"

    try:
        db.commit()
        db.refresh(overlap)
        logger.info(
            "Overlap pair #%d determination marked as '%s' by actor %s",
            overlap_id,
            canonical_status,
            current_user.get("sub") if current_user else "reviewer",
        )
        return overlap
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error saving reviewer determination: %s", exc)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record reviewer determination due to an internal database error.",
        )
