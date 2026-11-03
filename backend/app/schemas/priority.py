"""
Pydantic Schemas for Feature 3.5: AI-Assisted Priority System in SIH26264.
Provides data models for priority scoring, recommendations, explanations, and officer review actions.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PriorityFactors(BaseModel):
    """Breakdown of calculated factor scores for transparent AI justification."""
    severity_score: int
    severity_category: str
    ageing_days: int
    ageing_score: int
    deadline_status: str  # 'Overdue', 'Due Today', 'Approaching', 'Normal', 'Missing'
    deadline_score: int
    escalation_score: int
    recurring_score: int
    total_score: int

    model_config = ConfigDict(from_attributes=True)


class PriorityRecommendationOut(BaseModel):
    """DTO for an individual complaint priority recommendation and officer decision status."""
    id: Optional[int] = None
    complaint_id: int
    complaint_no: str
    institution_id: int
    institution_name: str
    bureau: str
    category: str
    subject: str
    current_priority: str
    recommended_priority: str  # 'Critical', 'High', 'Medium', 'Low'
    score: int
    factors: Optional[Dict[str, Any]] = None
    reason: str
    status: str  # 'Pending Review', 'Accepted', 'Overridden'
    has_discrepancy: bool
    initial_priority: Optional[str] = None
    final_priority: Optional[str] = None
    decision_notes: Optional[str] = None
    decided_by: Optional[int] = None
    decided_by_name: Optional[str] = None
    decided_at: Optional[datetime] = None
    deadline_date: Optional[date] = None
    filing_date: Optional[date] = None
    complaint_status: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PriorityActionRequest(BaseModel):
    """Request payload for officer accepting or overriding an AI priority recommendation."""
    new_priority: Optional[str] = Field(None, description="Chosen priority for override: Critical, High, Medium, Low")
    justification: Optional[str] = Field(None, description="Officer justification note for decision")


class PriorityHistoryItem(BaseModel):
    """Historical audit entry of a priority recommendation and decision."""
    id: int
    complaint_id: int
    recommended_priority: str
    score: int
    status: str
    initial_priority: Optional[str] = None
    final_priority: Optional[str] = None
    decision_notes: Optional[str] = None
    decided_by_name: Optional[str] = None
    decided_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PriorityDashboardResponse(BaseModel):
    """Comprehensive payload for Priority Monitoring Dashboard."""
    total_active_complaints: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    awaiting_review_count: int
    discrepancy_count: int
    priority_distribution: Dict[str, Dict[str, int]]
    recommendations: List[PriorityRecommendationOut]

    model_config = ConfigDict(from_attributes=True)

