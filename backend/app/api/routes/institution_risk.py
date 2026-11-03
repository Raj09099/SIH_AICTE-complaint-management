"""
Institution Risk Analysis API Routes for SIH26264 AICTE Complaint Intelligence.
Handles Feature 3.7:
- Council-wide institution risk & attention-support overview
- Granular risk scores and 5-factor scoring breakdowns
- Filterable surveillance grid by bureau, concern level, and trend
- Institution risk deep-dive with explainable justifications
- Strict role-based isolation (Officers council-wide vs Institutes own campus)
"""

from datetime import date
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_current_active_user, get_db
from app.schemas.institution_risk import (
    InstitutionRiskDetailResponse,
    InstitutionRiskOverviewResponse,
)
from app.services.institution_risk_service import InstitutionRiskService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/institution-risk", tags=["Institution Risk Analysis"])


@router.get(
    "/overview",
    response_model=InstitutionRiskOverviewResponse,
    summary="Fetch Council-wide Institution Risk Analysis telemetry and surveillance grid",
)
def get_risk_overview(
    search: Optional[str] = Query(None, description="Search by institution name, AICTE ID, or city"),
    bureau: Optional[str] = Query(None, description="Filter by bureau jurisdiction"),
    concern_level: Optional[str] = Query(None, description="Filter by concern level: High Concern, Moderate Concern, Low Concern, Insufficient Data"),
    trend: Optional[str] = Query(None, description="Filter by trend: Increasing, Stable, Decreasing, Insufficient Data"),
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> InstitutionRiskOverviewResponse:
    """
    Computes transparent multi-factor concern indicators for institutions:
    - Analyzes complaint volume, repeated categories, temporal trend, priority severity, and SLA overdue breaches
    - Classifies institutions into High Concern (60-100), Moderate Concern (30-59), Low Concern (0-29), or Insufficient Data
    - Enforces non-judgmental attention-support posture with prominent analytical disclaimers
    - Enforces role-based data isolation
    """
    return InstitutionRiskService.get_risk_overview(
        db=db,
        user=current_user,
        search=search,
        bureau=bureau,
        concern_level=concern_level,
        trend=trend,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/institutions",
    response_model=InstitutionRiskOverviewResponse,
    summary="Alias to overview for institution surveillance queries with filters",
)
def get_institutions_risk(
    search: Optional[str] = Query(None, description="Search by institution name, AICTE ID, or city"),
    bureau: Optional[str] = Query(None, description="Filter by bureau jurisdiction"),
    concern_level: Optional[str] = Query(None, description="Filter by concern level"),
    trend: Optional[str] = Query(None, description="Filter by trend"),
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> InstitutionRiskOverviewResponse:
    """Returns the filtered surveillance grid of institutions."""
    return InstitutionRiskService.get_risk_overview(
        db=db,
        user=current_user,
        search=search,
        bureau=bureau,
        concern_level=concern_level,
        trend=trend,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/institutions/{institution_id}",
    response_model=InstitutionRiskDetailResponse,
    summary="Retrieve granular risk profile, factor contributions, and explainable justifications for an institution",
)
def get_institution_risk_detail(
    institution_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> InstitutionRiskDetailResponse:
    """
    Deep-dive risk telemetry for an individual institution:
    - Provides full scoring factor points (Volume, Recurrence, Growth, Priority, Overdue)
    - Dynamic fact-based explanation
    - Recurring categories breakdown and month-by-month trajectory
    - Active complaints audit list
    - Explicit disclosure of student enrollment data limitations
    - Enforces role isolation (Institute accounts restricted to their own ID)
    """
    return InstitutionRiskService.get_institution_risk_detail(
        db=db,
        institution_id=institution_id,
        user=current_user,
    )

