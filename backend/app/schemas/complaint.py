"""
Pydantic schemas for Complaint request and response validation.
"""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.attachment import AttachmentOut


class ComplaintBase(BaseModel):
    complaint_no: Optional[str] = Field(
        None, description="Unique AICTE complaint tracking number (auto-generated if omitted)"
    )
    institution_id: int = Field(..., description="Foreign key to institutions table")
    complainant_type: str = Field(..., description="Type of complainant (Student, Faculty, Parent, etc.)")
    bureau: str = Field(..., description="Target AICTE bureau / cell")
    category: str = Field(..., description="Grievance classification category")
    subject: str = Field(..., description="Brief summary subject")
    description: str = Field(..., description="Full text description of complaint")
    priority: Optional[str] = Field("Medium", description="Priority level: Low, Medium, High, Urgent, Critical")
    status: Optional[str] = Field("New", description="Lifecycle status: New, Under Review, Transferred, Evidence Requested, Resolved, Escalated")
    incident_date: Optional[date] = Field(None, description="Date when incident allegedly occurred")
    deadline_date: Optional[date] = Field(None, description="SLA resolution deadline date")
    assigned_to: Optional[int] = Field(None, description="Officer user ID assigned to case")
    resolution_summary: Optional[str] = Field(None, description="Summary notes upon resolution")
    is_escalated: Optional[bool] = Field(False, description="Flag indicating executive escalation")
    detected_language: Optional[str] = Field("en", description="Detected language: en, hi, mr")
    translated_subject: Optional[str] = Field(None, description="English translation of subject for AI analysis")
    translated_description: Optional[str] = Field(None, description="English translation of description for AI analysis")
    translation_status: Optional[str] = Field("original", description="Translation status: original, translated, failed")
    translation_provider: Optional[str] = Field("internal_indic", description="Translation engine provider")
    translated_at: Optional[datetime] = Field(None, description="Timestamp of translation")


class ComplaintCreate(ComplaintBase):
    """Schema for complaint creation requests."""
    pass


class ComplaintUpdate(BaseModel):
    """Schema for updating complaint status, bureau transfer, and assignment."""
    priority: Optional[str] = None
    status: Optional[str] = None
    bureau: Optional[str] = None
    deadline_date: Optional[date] = None
    assigned_to: Optional[int] = None
    resolution_summary: Optional[str] = None
    is_escalated: Optional[bool] = None


class ComplaintStatusUpdate(BaseModel):
    """Schema for updating complaint status, resolution, or bureau transfer."""
    status: Optional[str] = Field(None, description="Target lifecycle status")
    resolution_summary: Optional[str] = Field(None, description="Resolution notes")
    assigned_to: Optional[int] = Field(None, description="Officer user ID assigned to case")
    bureau: Optional[str] = Field(None, description="Target AICTE bureau / cell for transfer")
    priority: Optional[str] = Field(None, description="Priority level")
    is_escalated: Optional[bool] = Field(None, description="Flag indicating executive escalation")


class ComplaintOut(ComplaintBase):
    """Schema for complaint output/response representation."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    complaint_no: str
    filing_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    attachments: List[AttachmentOut] = []
