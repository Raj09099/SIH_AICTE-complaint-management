"""
Notification ORM model for notifications table in SIH26264 schema.
Handles statutory reminders, SLA deadline alerts, and system advisories.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.complaint import Complaint
    from app.models.user import User


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("idx_notifications_user_id", "user_id"),
        Index("idx_notifications_complaint_id", "complaint_id"),
        Index("idx_notifications_is_read", "is_read"),
        Index("idx_notifications_created_at", "created_at"),
        UniqueConstraint(
            "user_id",
            "complaint_id",
            "notification_type",
            "reminder_date",
            name="uq_user_complaint_type_reminder_date",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    complaint_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 'DEADLINE_APPROACHING_3D', 'DEADLINE_TODAY', 'DEADLINE_OVERDUE', 'COMPLAINT_ASSIGNED', 'GENERAL'
    reminder_date: Mapped[date] = mapped_column(Date, nullable=False)
    urgency_level: Mapped[str] = mapped_column(
        String(20), nullable=False, default="INFO", server_default=text("'INFO'")
    )  # 'INFO', 'WARNING', 'CRITICAL'
    pending_action: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")
    complaint: Mapped[Optional["Complaint"]] = relationship(
        "Complaint", back_populates="notifications"
    )
