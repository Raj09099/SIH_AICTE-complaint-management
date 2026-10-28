"""
Institution Pydantic schemas for SIH26264 AICTE Technical Institutions Directory.
"""

from datetime import date, datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class InstitutionComplaintItem(BaseModel):
    """Brief representation of complaints filed against an institution."""
    id: int
    complaint_no: str
    bureau: str
    category: str
    subject: str
    priority: str
    status: str
    filing_date: Optional[date] = None
    deadline_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InstitutionOut(BaseModel):
    """Public institution directory item with aggregated complaint telemetry."""
    id: int
    aicte_id: str
    name: str
    state: str
    city: str
    address: Optional[str] = None
    institution_type: Optional[str] = "Technical Institute"
    affiliating_university: Optional[str] = None
    established_year: Optional[int] = None
    bureau_jurisdiction: Optional[str] = None
    is_active: Optional[bool] = True
    total_complaints: int = 0
    open_complaints: int = 0
    resolved_complaints: int = 0
    overdue_complaints: int = 0

    model_config = ConfigDict(from_attributes=True)


class InstitutionDetailOut(InstitutionOut):
    """Comprehensive institution profile with complaint registry and active bureau breakdown."""
    complaints: List[InstitutionComplaintItem] = []
    active_bureaus: List[str] = []
    category_distribution: Dict[str, int] = {}
    related_overlaps_count: int = 0


class InstitutionSummaryStats(BaseModel):
    """High-level council metrics across all institutions."""
    total_institutions: int = 0
    total_complaints: int = 0
    open_complaints: int = 0
    overdue_complaints: int = 0
    resolved_complaints: int = 0


class InstitutionListResponse(BaseModel):
    """Paginated list of institutions with aggregated council summary stats."""
    items: List[InstitutionOut]
    total: int
    skip: int
    limit: int
    stats: Optional[InstitutionSummaryStats] = None

