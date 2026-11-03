"""
Notifications & Deadline Monitoring API Routes for SIH26264 AICTE Complaint Intelligence.
Provides endpoints for statutory alerts, unread counts, mark-as-read, and deadline telemetry.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_active_user, get_db
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    DeadlinesTelemetryResponse,
    NotificationListResponse,
    NotificationOut,
    TriggerCheckResponse,
)
from app.services.reminder_service import ReminderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications & Deadlines"])


def _extract_user_info(user: Any) -> tuple[int, str, Optional[int]]:
    """Extracts (user_id, role, institution_id) whether user is a dict or a User model."""
    if isinstance(user, dict):
        user_id = user.get("id") or user.get("user_id") or 0
        role = (user.get("role") or "officer").lower()
        inst_id = user.get("institution_id")
        return user_id, role, inst_id
    user_id = getattr(user, "id", 0)
    role = (getattr(user, "role", "officer") or "officer").lower()
    inst_id = getattr(user, "institution_id", None)
    return user_id, role, inst_id


def _to_notification_out(n: Notification) -> NotificationOut:
    """Helper to convert Notification ORM model to NotificationOut with denormalized context."""
    return NotificationOut(
        id=n.id,
        user_id=n.user_id,
        complaint_id=n.complaint_id,
        title=n.title,
        message=n.message,
        notification_type=n.notification_type,
        reminder_date=n.reminder_date,
        urgency_level=n.urgency_level,
        pending_action=n.pending_action,
        is_read=n.is_read,
        read_at=n.read_at,
        created_at=n.created_at,
        complaint_no=n.complaint.complaint_no if n.complaint else None,
        institution_name=n.complaint.institution.name if n.complaint and n.complaint.institution else None,
        bureau=n.complaint.bureau if n.complaint else None,
        deadline_date=n.complaint.deadline_date if n.complaint else None,
    )


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List notifications for the authenticated user",
)
def list_notifications(
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    limit: int = Query(50, ge=1, le=200, description="Maximum notifications to return"),
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> NotificationListResponse:
    """
    Fetches notifications scoped to the authenticated user.
    Enforces user-level security:
    - Institute users only receive notifications related to their institution.
    - Officers receive notifications assigned to their user account.
    """
    user_id, role, inst_id = _extract_user_info(current_user)

    query = (
        db.query(Notification)
        .options(
            joinedload(Notification.complaint).joinedload(Complaint.institution),
        )
        .filter(Notification.user_id == user_id)
    )

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total_count = query.count()
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .count()
    )

    items = query.order_by(Notification.created_at.desc()).limit(limit).all()

    return NotificationListResponse(
        items=[_to_notification_out(n) for n in items],
        unread_count=unread_count,
        total_count=total_count,
    )


@router.get(
    "/unread-count",
    summary="Get unread notification count for the current user",
)
def get_unread_count(
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns the quick unread count for navbar bell indicator."""
    user_id, role, inst_id = _extract_user_info(current_user)
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .count()
    )
    return {"unread_count": unread_count}


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationOut,
    summary="Mark a specific notification as read",
)
def mark_notification_read(
    notification_id: int,
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> NotificationOut:
    """
    Marks a single notification as read.
    Validates that the notification belongs to the current user.
    """
    user_id, role, inst_id = _extract_user_info(current_user)

    notification = (
        db.query(Notification)
        .options(
            joinedload(Notification.complaint).joinedload(Complaint.institution),
        )
        .filter(Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification #{notification_id} not found.",
        )

    if notification.user_id != user_id and role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You cannot modify notifications belonging to another user.",
        )

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)

    return _to_notification_out(notification)


@router.post(
    "/mark-all-read",
    summary="Mark all unread notifications as read for current user",
)
def mark_all_notifications_read(
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Marks all notifications belonging to the authenticated user as read."""
    user_id, role, inst_id = _extract_user_info(current_user)
    now = datetime.now(timezone.utc)
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .update({Notification.is_read: True, Notification.read_at: now}, synchronize_session=False)
    )
    db.commit()

    return {
        "success": True,
        "marked_read_count": updated,
        "timestamp": now.isoformat(),
    }


@router.get(
    "/deadlines",
    response_model=DeadlinesTelemetryResponse,
    summary="Get deadline telemetry for dashboard and monitoring table",
)
def get_deadlines(
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> DeadlinesTelemetryResponse:
    """
    Retrieves real database deadline telemetry for dashboard cards and monitoring grid.
    Scoped by user role:
    - Institute users receive complaints for their institution only.
    - Officers receive monitored complaints across bureaus.
    """
    return ReminderService.get_deadlines_telemetry(db=db, user=current_user)


@router.post(
    "/check",
    response_model=TriggerCheckResponse,
    summary="Trigger an on-demand deadline reminder evaluation",
)
def trigger_deadline_check(
    current_user: Any = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> TriggerCheckResponse:
    """
    Triggers an immediate evaluation of statutory SLA deadlines.
    Restricted to authenticated AICTE officers / admins.
    """
    user_id, role, inst_id = _extract_user_info(current_user)
    if role == "institute":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only AICTE officers can trigger statutory reminder evaluations.",
        )

    return ReminderService.check_and_generate_reminders(db=db)
