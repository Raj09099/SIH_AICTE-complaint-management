"""
Pydantic Schemas for Feature 3: Resolution Evidence Checker in SIH26264.
Provides data transfer models for:
- Explainable, mathematically consistent 6-factor scoring breakdown
- 4-state institutional verification checklist (Present, Missing, Not Applicable, Unable to Verify)
- Entity matching and financial amount mismatch detection
- Multi-severity warning system (Critical, Warning, Information)
- Authenticity disclaimer and human review determinations
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class EvidenceScoreComponent(BaseModel):
    """Component of the transparent 6-factor scoring formula."""
    factor: str
    weight: float
    raw_value: float  # e.g., raw similarity percentage or match percentage
    score: float      # Actual weighted contribution
    explanation: str
    evidence: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ChecklistItem(BaseModel):
    """Single verification criterion with 4 possible states."""
    key: str
    label: str
    status: str  # 'Present', 'Missing', 'Not Applicable', 'Unable to Verify'
    reason: str

    model_config = ConfigDict(from_attributes=True)


class EvidenceWarning(BaseModel):
    """Severity-classified warning for officer awareness."""
    severity: str  # 'Critical', 'Warning', 'Information'
    message: str

    model_config = ConfigDict(from_attributes=True)


class EntityMatchResult(BaseModel):
    """Entity comparison result between complaint and uploaded resolution document."""
    field: str
    complaint_value: Optional[str] = None
    document_value: Optional[str] = None
    status: str  # 'MATCH', 'MISMATCH', 'MISSING', 'NOT_APPLICABLE'
    details: str

    model_config = ConfigDict(from_attributes=True)


class EvidenceRelevanceBreakdown(BaseModel):
    """Comprehensive, mathematically explainable audit breakdown."""
    total_score: float
    percentage: int
    risk_level: str  # 'Low', 'Medium', 'High'
    recommendation: str
    recommendation_code: str  # 'APPROVE_RECOMMENDED', 'SCRUTINIZE_RECOMMENDED', 'REJECT_RECOMMENDED'
    score_components: List[EvidenceScoreComponent] = Field(default_factory=list)
    checklist: List[ChecklistItem] = Field(default_factory=list)
    entity_matches: List[EntityMatchResult] = Field(default_factory=list)
    warnings: List[EvidenceWarning] = Field(default_factory=list)
    matched_keywords: List[str] = Field(default_factory=list)
    missing_elements: List[str] = Field(default_factory=list)
    all_elements_present: bool = False
    is_scanned_pdf: bool = False
    requires_ocr: bool = False
    word_count: int = 0
    page_count: int = 1
    summary: str = ""
    authenticity_disclaimer: str = (
        "Verification Intelligence Notice: Document text analysis provides decision support. "
        "It does not legally certify financial transaction execution, document authenticity, "
        "or banking settlement. Official AICTE officer review is mandatory before complaint closure."
    )

    model_config = ConfigDict(from_attributes=True)


class EvidenceUploadResponse(BaseModel):
    id: int
    complaint_id: int
    complaint_no: str
    filename: str
    file_size_bytes: int
    mime_type: str
    extracted_text: str
    relevance_score: float
    relevance_breakdown: EvidenceRelevanceBreakdown
    human_verified: bool = False
    reviewer_decision: Optional[str] = None
    verification_notes: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceReviewRequest(BaseModel):
    decision: str  # 'approved', 'rejected', 'more_info_needed'
    verification_notes: str = Field(..., min_length=5, description="Mandatory officer review rationale")
    resolution_summary: Optional[str] = None


class EvidenceComplaintCandidate(BaseModel):
    id: int
    complaint_no: str
    category: str
    bureau: str
    subject: str
    description: str
    institution_id: int
    institution_name: str
    status: str
    filing_date: Optional[str] = None
    evidence_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class EvidenceListItem(BaseModel):
    id: int
    complaint_id: int
    filename: str
    file_size_bytes: int
    mime_type: str
    relevance_score: float
    percentage: int
    risk_level: str
    recommendation: str
    human_verified: bool
    reviewer_decision: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
