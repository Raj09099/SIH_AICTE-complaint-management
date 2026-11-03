"""
Recurrence Radar API Routes for SIH26264 AICTE Complaint Intelligence.
Handles Feature 3.4:
- Council-wide systemic recurrence overview
- Month-by-month trajectory and trend classification
- Institution recurrence rankings
- Single institution recurrence deep dive
"""

from datetime import date
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_current_active_user, get_db
from app.schemas.recurrence import (
    InstitutionRecurrenceDetailResponse,
    RecurrenceRadarOverviewResponse,
)
from app.services.recurrence_service import RecurrenceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recurrence", tags=["Recurrence Radar"])


@router.get(
    "/overview",
    response_model=RecurrenceRadarOverviewResponse,
    summary="Fetch Council-wide Recurrence Radar telemetry, monthly trends, and institution rankings",
)
def get_recurrence_overview(
    search: Optional[str] = Query(None, description="Search by institution name, AICTE ID, or city"),
    category: Optional[str] = Query(None, description="Filter by complaint category"),
    bureau: Optional[str] = Query(None, description="Filter by bureau jurisdiction"),
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> RecurrenceRadarOverviewResponse:
    """
    Computes systemic recurrence across institutions:
    - Identifies repeated grievances within the same college
    - Analyzes chronological monthly complaint volume
    - Classifies trajectory into Increasing, Decreasing, or Stable trends
    - Enforces role-based data isolation
    """
    return RecurrenceService.get_recurrence_overview(
        db=db,
        user=current_user,
        search=search,
        category=category,
        bureau=bureau,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/institution/{institution_id}",
    response_model=InstitutionRecurrenceDetailResponse,
    summary="Fetch detailed recurrence dossier and category trajectory for a single institution",
)
def get_institution_recurrence(
    institution_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> InstitutionRecurrenceDetailResponse:
    """
    Returns granular category-level recurrence patterns and month-by-month history
    for a specific college. Used by the Institution 360° dashboard.
    """
    return RecurrenceService.get_institution_recurrence_detail(
        db=db,
        institution_id=institution_id,
        user=current_user,
    )

