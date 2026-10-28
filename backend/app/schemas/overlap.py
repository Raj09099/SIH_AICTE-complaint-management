"""
Pydantic schemas for Case Overlap and Relationship Detection.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OverlapComplaintBrief(BaseModel):
    """Brief metadata representing an involved complaint in an overlap pair."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    complaint_no: str
    institution_id: int
    bureau: str
    category: str
    subject: str
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    filing_date: Optional[date] = None


class CaseOverlapOut(BaseModel):
    """Schema for detected case overlap pair representation."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    primary_complaint_id: int
    related_complaint_id: int
    similarity_score: float
    overlap_type: Optional[str] = "Semantic Duplicate"
    reason: Optional[str] = None
    matching_keywords: Optional[List[str]] = Field(default_factory=list)
    status: Optional[str] = "Flagged"
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    # Nested complaint details
    primary_complaint: Optional[OverlapComplaintBrief] = None
    related_complaint: Optional[OverlapComplaintBrief] = None


class OverlapDetectRequest(BaseModel):
    """Request parameters for triggering case overlap analysis."""
    threshold: Optional[float] = Field(
        0.60, ge=0.1, le=1.0, description="Minimum similarity threshold (0.1 to 1.0)"
    )
    limit: Optional[int] = Field(
        50, ge=1, le=200, description="Maximum number of overlap pairs to detect"
    )
    persist: Optional[bool] = Field(
        True, description="Whether to persist detected flagged pairs into case_overlaps table"
    )
    complaint_id: Optional[int] = Field(
        None, description="Optional specific complaint ID to evaluate against candidate pool"
    )


class OverlapReviewRequest(BaseModel):
    """Reviewer decision payload for binding human determinations."""
    decision: str = Field(
        ...,
        description="Reviewer determination: 'Duplicate', 'Related', 'Unrelated', 'Confirmed Linked', or 'Dismissed'",
    )
    notes: Optional[str] = Field(
        None, description="Optional officer justification, directive, or resolution notes"
    )
    reviewer_id: Optional[int] = Field(
        None, description="Optional officer user ID making the determination"
    )


class OverlapDetectResponse(BaseModel):
    """Response summary for overlap detection run."""
    detected_count: int
    persisted_count: int
    threshold_used: float
    pairs: List[CaseOverlapOut]

