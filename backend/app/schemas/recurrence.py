"""
Pydantic Schemas for Feature 3.4: Recurrence Radar in SIH26264.
Provides data transfer models for institution systemic recurrence, AI-driven agglomerative clustering,
trend analytics, and category metrics.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class MonthlyTrendPoint(BaseModel):
    """Monthly frequency datapoint for time-series recurrence charts."""
    month: str  # Format: "YYYY-MM", e.g. "2026-10"
    total_complaints: int
    recurring_complaints: int

    model_config = ConfigDict(from_attributes=True)


class CategoryRecurrenceStat(BaseModel):
    """Category-level recurrence breakdown within an institution or Council-wide."""
    category: str
    bureau: Optional[str] = None
    total_complaints: int
    institutions_affected_count: int
    trend: str  # 'Increasing', 'Decreasing', 'Stable', 'Insufficient Data'
    is_recurring: bool

    model_config = ConfigDict(from_attributes=True)


class AIRecurringCluster(BaseModel):
    """AI-grouped cluster of semantically similar complaints within an institution."""
    cluster_id: int
    title: str
    category: str
    complaint_count: int
    cohesion_score: float  # e.g. 0.85 (85% similarity)
    complaint_ids: List[int]
    sample_subjects: List[str]

    model_config = ConfigDict(from_attributes=True)


class InstitutionRecurrenceItem(BaseModel):
    """Institution row in the Recurrence Radar monitoring table."""
    institution_id: int
    aicte_id: str
    name: str
    state: str
    city: str
    bureau: str
    total_complaints: int
    recurring_complaints_count: int
    primary_recurring_category: str
    primary_category_count: int
    trend: str  # 'Increasing', 'Decreasing', 'Stable', 'Insufficient Data'
    monthly_trend: List[MonthlyTrendPoint]
    recurring_clusters_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class RecurrenceRadarOverviewResponse(BaseModel):
    """Comprehensive payload for Recurrence Radar page."""
    total_complaints_analyzed: int
    total_recurring_complaints: int
    institutions_monitored: int
    institutions_with_recurrence: int
    escalating_institutions_count: int
    top_recurring_categories: List[CategoryRecurrenceStat]
    bureau_distribution: Dict[str, int]
    overall_monthly_trend: List[MonthlyTrendPoint]
    institutions: List[InstitutionRecurrenceItem]
    ai_methodology: Optional[str] = "TF-IDF + Cosine Similarity + Agglomerative Clustering"

    model_config = ConfigDict(from_attributes=True)


class InstitutionRecurrenceComplaint(BaseModel):
    id: int
    complaint_no: str
    category: str
    subject: str
    status: str
    priority: str
    filing_date: Optional[str] = None
    deadline_date: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InstitutionRecurrenceDetailResponse(BaseModel):
    """Detailed recurrence analysis for a single institution (Institution 360° deep dive)."""
    institution_id: int
    aicte_id: str
    name: str
    state: str
    city: str
    bureau_jurisdiction: Optional[str] = None
    total_complaints: int
    recurring_complaints_count: int
    overall_trend: str
    category_breakdown: List[CategoryRecurrenceStat]
    monthly_trend: List[MonthlyTrendPoint]
    complaints: List[InstitutionRecurrenceComplaint]
    ai_clusters: Optional[List[AIRecurringCluster]] = []

    model_config = ConfigDict(from_attributes=True)


