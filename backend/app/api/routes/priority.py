"""
AI-Assisted Priority System API Routes for SIH26264 AICTE Complaint Intelligence.
Handles Feature 3.5:
- Priority monitoring dashboard telemetry
- AI recommended priority inspection with full factor explanations
- Officer decision workflows: Accept recommendation or Override priority
- Decision audit history retrieval
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_active_user, get_db
from app.models.complaint import Complaint
from app.schemas.priority import (
    PriorityActionRequest,
    PriorityDashboardResponse,
    PriorityHistoryItem,
    PriorityRecommendationOut,
)
from app.services.priority_service import PriorityService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/priority", tags=["AI Priority System"])


@router.get(
    "/dashboard",
    response_model=PriorityDashboardResponse,
    summary="Fetch Priority Monitoring Dashboard telemetry, distributions, and recommendation queues",
)
def get_priority_dashboard(
    bureau: Optional[str] = Query(None, description="Filter by bureau jurisdiction"),
    recommended_priority: Optional[str] = Query(None, description="Filter by recommended priority: Critical, High, Medium, Low"),
    discrepancy_only: bool = Query(False, description="Filter for complaints where assigned priority < recommended"),
    search: Optional[str] = Query(None, description="Search by complaint number, institution name, or subject"),
    limit: int = Query(50, ge=1, le=200, description="Page size"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> PriorityDashboardResponse:
    """
    Returns AI-assisted priority telemetry across active complaints:
    - Tier counts: Critical, High, Medium, Low
    - Priority distribution comparison: Current Assigned vs AI Recommended
    - Discrepancy counter highlighting under-prioritized critical grievances
    - Actionable queue of recommendations for officer triage
    """
    return PriorityService.get_priority_dashboard_telemetry(
        db=db,
        user=current_user,
        bureau=bureau,
        recommended_priority=recommended_priority,
        discrepancy_only=discrepancy_only,
        search=search,
        limit=limit,
        skip=skip,
    )


@router.get(
    "/complaints/{complaint_id}",
    response_model=PriorityRecommendationOut,
    summary="Get AI priority recommendation and factor explanation for a specific complaint",
)
def get_complaint_priority(
    complaint_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> PriorityRecommendationOut:
    """
    Retrieves or generates on-the-fly the transparent priority recommendation,
    including severity rating, ageing duration, SLA deadline urgency, and justification.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint #{complaint_id} was not found.",
        )

    # Scoping: Institute users can only view their own college's complaints
    user_role = (current_user.get("role") or "").lower()
    inst_id = current_user.get("institution_id")
    if user_role == "institute" and inst_id and complaint.institution_id != inst_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are only authorized to inspect priority for your own college grievances.",
        )

    rec = PriorityService.get_or_create_recommendation(db, complaint)
    return PriorityService.to_recommendation_out(complaint, rec)


@router.post(
    "/complaints/{complaint_id}/accept",
    response_model=PriorityRecommendationOut,
    summary="Officer accepts the AI recommended priority level",
)
def accept_priority_recommendation(
    complaint_id: int,
    action: Optional[PriorityActionRequest] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> PriorityRecommendationOut:
    """
    Authorized officer action:
    - Confirms the AI-recommended priority
    - Updates complaint.priority in database
    - Records decision status as 'Accepted' and logs the acting officer
    """
    notes = action.justification if action else None
    return PriorityService.accept_recommendation(
        db=db,
        complaint_id=complaint_id,
        user=current_user,
        notes=notes,
    )


@router.post(
    "/complaints/{complaint_id}/override",
    response_model=PriorityRecommendationOut,
    summary="Officer overrides the AI priority recommendation with a chosen priority level",
)
def override_priority_recommendation(
    complaint_id: int,
    action: PriorityActionRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> PriorityRecommendationOut:
    """
    Authorized officer action:
    - Overrides AI recommendation with a chosen priority level (Critical, High, Medium, Low)
    - Updates complaint.priority in database
    - Records decision status as 'Overridden' with officer's justification note
    """
    if not action or not action.new_priority:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A target 'new_priority' (Critical, High, Medium, Low) is required for override.",
        )

    return PriorityService.override_recommendation(
        db=db,
        complaint_id=complaint_id,
        user=current_user,
        chosen_priority=action.new_priority,
        justification=action.justification,
    )


@router.get(
    "/complaints/{complaint_id}/history",
    response_model=List[PriorityHistoryItem],
    summary="Retrieve recommendation and officer decision audit trail for a complaint",
)
def get_complaint_priority_history(
    complaint_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[PriorityHistoryItem]:
    """
    Returns complete chronological history of AI recommendations,
    officer reviews, accepted priorities, and manual overrides.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint #{complaint_id} was not found.",
        )

    user_role = (current_user.get("role") or "").lower()
    inst_id = current_user.get("institution_id")
    if user_role == "institute" and inst_id and complaint.institution_id != inst_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are only authorized to inspect history for your own college grievances.",
        )

    return PriorityService.get_priority_history(db, complaint_id)

