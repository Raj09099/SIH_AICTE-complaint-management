"""
Pydantic Schemas for Feature 3.7: Institution Risk Analysis.
Encapsulates transparent attention-support indicator metrics, multi-factor scoring breakdowns,
and council-wide surveillance telemetry.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RiskScoringFactors(BaseModel):
    """Transparent breakdown of the 5 weighted components contributing to the total concern score."""
    volume_score: int = Field(..., ge=0, le=20, description="Complaint volume contribution (0-20 pts)")
    volume_count: int = Field(..., ge=0, description="Total raw complaint count")
    recurrence_score: int = Field(..., ge=0, le=25, description="Repeated grievance contribution (0-25 pts)")
    recurring_count: int = Field(..., ge=0, description="Complaints belonging to recurring categories (>=2)")
    recurring_categories_count: int = Field(..., ge=0, description="Distinct repeated categories")
    growth_score: int = Field(..., ge=0, le=20, description="Temporal trajectory contribution (0-20 pts)")
    growth_trend: str = Field(..., description="Increasing, Decreasing, Stable, or Insufficient Data")
    priority_score: int = Field(..., ge=0, le=20, description="High/Critical severity cases contribution (0-20 pts)")
    high_critical_count: int = Field(..., ge=0, description="Number of High or Critical priority complaints")
    overdue_score: int = Field(..., ge=0, le=15, description="Overdue unresolved cases contribution (0-15 pts)")
    overdue_count: int = Field(..., ge=0, description="Active complaints past SLA deadline")
    total_score: int = Field(..., ge=0, le=100, description="Total composite concern score (0-100 pts)")


class InstitutionRiskItem(BaseModel):
    """Summary record for an institution in the Risk Surveillance Grid."""
    institution_id: int
    aicte_id: str
    name: str
    state: str
    city: str
    bureau: str
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    recurring_complaints: int
    trend: str
    high_critical_cases: int
    overdue_cases: int
    risk_score: int
    concern_level: str  # High Concern, Moderate Concern, Low Concern, Insufficient Data
    primary_concern_reason: str
    factors: RiskScoringFactors


class InstitutionRiskOverviewResponse(BaseModel):
    """Council-wide summary response for the Institution Risk Analysis dashboard."""
    total_institutions_analyzed: int
    high_concern_count: int
    moderate_concern_count: int
    low_concern_count: int
    insufficient_data_count: int
    concern_level_distribution: Dict[str, int]
    trend_distribution: Dict[str, int]
    bureau_risk_distribution: Dict[str, Dict[str, int]]
    top_recurring_risk_categories: List[Dict[str, Any]]
    institutions: List[InstitutionRiskItem]
    disclaimer: str = (
        "Institution Concern Indicator is an analytical attention-support signal based on available "
        "complaint data. It is not an institutional quality rating, proof of wrongdoing or automatic "
        "finding against any institution. All findings require authorized human review."
    )


class RiskComplaintSummary(BaseModel):
    """Brief complaint record included in the institution risk deep dive."""
    id: int
    complaint_no: str
    category: str
    subject: str
    status: str
    priority: str
    is_overdue: bool
    filing_date: Optional[str] = None
    deadline_date: Optional[str] = None


class MonthlyRiskTrendPoint(BaseModel):
    """Monthly complaint frequency point."""
    month: str
    count: int


class RecurringCategoryStat(BaseModel):
    """Category recurrence representation."""
    category: str
    count: int
    is_recurring: bool = True


class InstitutionRiskDetailResponse(BaseModel):
    """Detailed risk analysis profile for a specific institution."""
    institution_id: int
    aicte_id: str
    name: str
    state: str
    city: str
    institution_type: Optional[str] = None
    bureau_jurisdiction: Optional[str] = None
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    overdue_complaints: int
    recurring_complaints: int
    recurring_categories: List[RecurringCategoryStat]
    monthly_trend: List[MonthlyRiskTrendPoint]
    high_critical_cases: int
    risk_score: int
    concern_level: str
    scoring_factors: RiskScoringFactors
    explanation: str
    data_coverage_period: str
    data_limitations: str
    active_complaints_list: List[RiskComplaintSummary]
    disclaimer: str = (
        "Institution Concern Indicator is an analytical attention-support signal based on available "
        "complaint data. It is not an institutional quality rating, proof of wrongdoing or automatic "
        "finding against any institution. All findings require authorized human review."
    )
