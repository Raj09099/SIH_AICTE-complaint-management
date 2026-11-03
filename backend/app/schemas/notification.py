"""
Pydantic schemas for Notification and Deadline monitoring payloads.
"""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str
    reminder_date: date
    urgency_level: str = "INFO"
    pending_action: Optional[str] = None


class NotificationOut(NotificationBase):
    id: int
    user_id: int
    complaint_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    # Denormalized context fields for quick client UI display
    complaint_no: Optional[str] = None
    institution_name: Optional[str] = None
    bureau: Optional[str] = None
    deadline_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: List[NotificationOut]
    unread_count: int
    total_count: int


class DeadlineItemOut(BaseModel):
    complaint_id: int
    complaint_no: str
    institution_id: int
    institution_name: str
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: str = "Unassigned"
    bureau: str
    category: str
    priority: str
    status: str
    deadline_date: Optional[date] = None
    days_remaining: int
    urgency_level: str  # 'OVERDUE', 'DUE_TODAY', 'UPCOMING', 'NORMAL'
    pending_action: str

    model_config = ConfigDict(from_attributes=True)


class DeadlinesTelemetryResponse(BaseModel):
    upcoming_count: int
    due_today_count: int
    overdue_count: int
    total_monitored: int
    items: List[DeadlineItemOut]


class TriggerCheckResponse(BaseModel):
    processed: int
    new_notifications_created: int
    timestamp: str
