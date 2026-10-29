"""
Pydantic schemas for Feature 2: Multi-Institution Problem Pattern Detector.
Validates pattern discovery parameters, clustering requests, and serialized pattern outputs.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InstitutionPatternBrief(BaseModel):
    id: int
    aicte_id: str
    name: str
    state: Optional[str] = None
    city: Optional[str] = None
    bureau_jurisdiction: Optional[str] = None
    complaint_count: int = 1


class ComplaintPatternBrief(BaseModel):
    id: int
    complaint_no: str
    institution_id: int
    institution_name: Optional[str] = None
    institution_aicte_id: Optional[str] = None
    category: str
    bureau: str
    subject: str
    status: Optional[str] = "New"
    priority: Optional[str] = "Medium"
    filing_date: Optional[date] = None


class MonthlyTrendItem(BaseModel):
    month: str  # YYYY-MM
    count: int


class ProblemPatternOut(BaseModel):
    id: Optional[int] = None
    pattern_code: str
    title: str
    category: str
    bureau: Optional[str] = None
    state: Optional[str] = None
    affected_institutions_count: int
    complaint_count: int
    cluster_score: float = Field(..., ge=0.0, le=1.0)
    severity_score: float
    description: Optional[str] = None
    representative_text: Optional[str] = None
    keywords: List[str] = []
    affected_institutions: List[InstitutionPatternBrief] = []
    sample_complaint_ids: List[int] = []
    complaints: List[ComplaintPatternBrief] = []
    trend_distribution: List[MonthlyTrendItem] = []
    trend_direction: str = "Stable"
    earliest_filing_date: Optional[date] = None
    latest_filing_date: Optional[date] = None
    status: str = "Active"
    created_at: Optional[datetime] = None


class PatternDiscoveryRequest(BaseModel):
    threshold: float = Field(
        default=0.25,
        ge=0.10,
        le=0.95,
        description="TF-IDF cosine similarity threshold for clustering related grievances",
    )
    min_institutions: int = Field(
        default=2,
        ge=2,
        description="Minimum number of distinct institutions required to qualify as a multi-institution pattern",
    )
    min_complaints: int = Field(
        default=2,
        ge=2,
        description="Minimum number of total complaints required in a pattern",
    )
    category: Optional[str] = Field(
        default=None,
        description="Optional filter by grievance category",
    )
    bureau: Optional[str] = Field(
        default=None,
        description="Optional filter by AICTE bureau",
    )
    state: Optional[str] = Field(
        default=None,
        description="Optional filter by institution state",
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Maximum number of patterns to return",
    )


class PatternListResponse(BaseModel):
    total: int
    threshold: float
    min_institutions: int
    total_complaints_analyzed: int
    total_distinct_institutions_affected: int
    patterns: List[ProblemPatternOut]
