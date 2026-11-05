"""
Pydantic Schemas for Institutional Compliance and Complaint Notifications.
Feature 3.3 (Institute Portal): Institution-Specific Compliance Management.
"""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ComplianceSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_requirements: int = Field(..., description="Total compliance requirements assigned to the institution")
    completed_requirements: int = Field(..., description="Completed / verified compliance tasks")
    upcoming_deadlines: int = Field(..., description="Deadlines due within the next 30 days")
    overdue_submissions: int = Field(..., description="Past due compliance submissions")
    institution_id: int
    institution_name: str


class ComplianceDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    compliance_id: int
    institution_id: int
    file_name: str
    file_type: str
    file_size: int
    remarks: Optional[str] = None
    submitted_at: datetime
    submitted_by_name: Optional[str] = None
    verification_status: str
    download_url: str


class ComplianceDeadlineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_id: int
    requirement_name: str
    category: str
    description: str
    due_date: date
    status: str
    priority: str
    days_remaining: int
    is_overdue: bool
    is_due_today: bool
    is_upcoming: bool
    documents_count: int
    latest_document: Optional[ComplianceDocumentOut] = None


class ComplianceDocumentUploadResponse(BaseModel):
    success: bool
    message: str
    document: ComplianceDocumentOut
    compliance_status: str


class InstituteReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    complaint_id: Optional[int] = None
    complaint_no: Optional[str] = None
    complaint_subject: Optional[str] = None
    complaint_status: Optional[str] = None
    title: str
    message: str
    notification_type: str
    urgency_level: str
    pending_action: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    link: Optional[str] = None

