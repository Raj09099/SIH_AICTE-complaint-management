"""
Reminder and Deadline Monitoring Service for Feature 3.3.
Monitors statutory SLA deadlines, identifies approaching/due/overdue cases,
generates idempotent reminders, and derives lifecycle-based pending actions.
"""

from datetime import date, datetime, timezone
import logging
from typing import Dict, List, Optional
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    DeadlineItemOut,
    DeadlinesTelemetryResponse,
    TriggerCheckResponse,
)

logger = logging.getLogger(__name__)


def derive_pending_action(complaint: Complaint) -> str:
    """
    Derives the actual next pending action using existing complaint lifecycle information.
    Does not use generic hardcoded strings or fabricated data.
    If an action cannot be reliably determined, returns 'Action not specified'.
    """
    if not complaint:
        return "Action not specified"

    st = (complaint.status or "").strip().lower()

    if st in ("resolved", "closed"):
        return "Case Formally Closed"
    elif st == "new":
        if not complaint.assigned_to:
            return "Initial Triage & Officer Assignment"
        return "Initiate Case Assessment"
    elif st == "under review":
        return "Conduct Bureau Inquiry & Assessment"
    elif st == "evidence requested":
        return "Verify Institutional Compliance Affidavits"
    elif st == "transferred":
        target = complaint.bureau or "Target Bureau"
        return f"Awaiting Acceptance by {target}"
    elif st == "escalated":
        return "Immediate Statutory Redressal Hearing"
    elif st:
        # Known non-standard status
        return f"Statutory Review ({complaint.status})"
    else:
        return "Action not specified"


class ReminderService:
    @staticmethod
    def derive_urgency_level(days_remaining: int) -> str:
        if days_remaining < 0:
            return "OVERDUE"
        elif days_remaining == 0:
            return "DUE_TODAY"
        elif days_remaining <= 3:
            return "UPCOMING"
        return "NORMAL"

    @classmethod
    def check_and_generate_reminders(
        cls,
        db: Session,
        reference_date: Optional[date] = None,
    ) -> TriggerCheckResponse:
        """
        Evaluates active complaints against statutory deadlines.
        Generates reminders:
        - 3 days before deadline: 1 reminder
        - On deadline day: 1 reminder
        - Overdue (days_remaining < 0): 1 reminder per day until resolved.
        Enforces duplicate prevention via database unique constraint and pre-checks.
        Never alerts on Resolved or Closed complaints.
        """
        today = reference_date or date.today()
        logger.info("Executing automated deadline reminder check for reference date: %s", today)

        # Query all active complaints that have a configured deadline
        active_complaints = (
            db.query(Complaint)
            .options(
                joinedload(Complaint.institution),
                joinedload(Complaint.assignee),
            )
            .filter(
                Complaint.deadline_date.isnot(None),
                Complaint.status.isnot(None),
                ~Complaint.status.in_(["Resolved", "Closed"]),
            )
            .all()
        )

        processed_count = 0
        new_notifications_count = 0

        for complaint in active_complaints:
            processed_count += 1
            deadline = complaint.deadline_date
            days_remaining = (deadline - today).days

            # Determine if a reminder is warranted
            notif_type = None
            urgency = "INFO"
            title = None
            message = None

            pending_action = derive_pending_action(complaint)
            inst_name = complaint.institution.name if complaint.institution else f"Institution #{complaint.institution_id}"

            if days_remaining == 3:
                notif_type = "DEADLINE_APPROACHING_3D"
                urgency = "WARNING"
                title = f"Statutory SLA Reminder: 3 Days Remaining ({complaint.complaint_no})"
                message = (
                    f"Complaint {complaint.complaint_no} regarding '{complaint.category}' at "
                    f"{inst_name} has its statutory SLA deadline in 3 days ({deadline}). "
                    f"Pending Action: {pending_action}."
                )
            elif days_remaining == 0:
                notif_type = "DEADLINE_TODAY"
                urgency = "CRITICAL"
                title = f"Statutory SLA Alert: Deadline Due Today ({complaint.complaint_no})"
                message = (
                    f"Complaint {complaint.complaint_no} regarding '{complaint.category}' at "
                    f"{inst_name} is due TODAY ({deadline}). "
                    f"Pending Action: {pending_action}."
                )
            elif days_remaining < 0:
                notif_type = "DEADLINE_OVERDUE"
                urgency = "CRITICAL"
                days_overdue = abs(days_remaining)
                title = f"SLA Breach Notice: {days_overdue}d Overdue ({complaint.complaint_no})"
                message = (
                    f"Complaint {complaint.complaint_no} regarding '{complaint.category}' at "
                    f"{inst_name} has exceeded its SLA deadline by {days_overdue} day(s) (Target: {deadline}). "
                    f"Pending Action: {pending_action}."
                )

            if not notif_type:
                # Neither 3 days, today, nor overdue (e.g. 10 days away, or 2 days away)
                continue

            # Determine recipient officer
            # Strict safety: Never broadcast unassigned complaints to all officers.
            target_user_ids: List[int] = []
            if complaint.assigned_to:
                target_user_ids.append(complaint.assigned_to)
            else:
                # If unassigned, find an administrator or bureau head for this specific bureau
                bureau_lead = (
                    db.query(User.id)
                    .filter(
                        User.bureau == complaint.bureau,
                        User.role.in_(["admin", "bureau_head"]),
                        User.is_active == True,
                    )
                    .first()
                )
                if bureau_lead:
                    target_user_ids.append(bureau_lead[0])

            if not target_user_ids:
                # Safe fallback: no specific officer assigned and no bureau lead found
                logger.debug("Skipping notification creation for unassigned complaint #%s without bureau lead", complaint.id)
                continue

            for uid in target_user_ids:
                # Check for existing notification to prevent duplicates
                existing = (
                    db.query(Notification.id)
                    .filter(
                        Notification.user_id == uid,
                        Notification.complaint_id == complaint.id,
                        Notification.notification_type == notif_type,
                        Notification.reminder_date == today,
                    )
                    .first()
                )

                if existing:
                    continue

                notification = Notification(
                    user_id=uid,
                    complaint_id=complaint.id,
                    title=title,
                    message=message,
                    notification_type=notif_type,
                    reminder_date=today,
                    urgency_level=urgency,
                    pending_action=pending_action,
                    is_read=False,
                )
                db.add(notification)
                new_notifications_count += 1

        if new_notifications_count > 0:
            try:
                db.commit()
                logger.info(
                    "Deadline check completed: %d complaints evaluated, %d new notifications committed",
                    processed_count,
                    new_notifications_count,
                )
            except Exception as e:
                db.rollback()
                logger.error("Failed to commit reminder notifications: %s", e)
                raise

        return TriggerCheckResponse(
            processed=processed_count,
            new_notifications_created=new_notifications_count,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    def get_deadlines_telemetry(
        cls,
        db: Session,
        user: User,
        reference_date: Optional[date] = None,
    ) -> DeadlinesTelemetryResponse:
        """
        Retrieves real database deadline telemetry for dashboard and monitoring table.
        Scopes results based on user role:
        - Institute: Only complaints belonging to user.institution_id.
        - AICTE Officer: All complaints across AICTE monitored bureaus.
        """
        today = reference_date or date.today()

        query = (
            db.query(Complaint)
            .options(
                joinedload(Complaint.institution),
                joinedload(Complaint.assignee),
            )
            .filter(
                Complaint.deadline_date.isnot(None),
                Complaint.status.isnot(None),
                ~Complaint.status.in_(["Resolved", "Closed"]),
            )
        )

        role = (user.get("role") if isinstance(user, dict) else getattr(user, "role", "officer")) or "officer"
        inst_id = user.get("institution_id") if isinstance(user, dict) else getattr(user, "institution_id", None)
        if str(role).lower() == "institute":
            query = query.filter(Complaint.institution_id == inst_id)

        complaints = query.order_by(Complaint.deadline_date.asc()).all()

        items: List[DeadlineItemOut] = []
        upcoming_count = 0
        due_today_count = 0
        overdue_count = 0

        for c in complaints:
            days_rem = (c.deadline_date - today).days
            urgency = cls.derive_urgency_level(days_rem)

            if urgency == "OVERDUE":
                overdue_count += 1
            elif urgency == "DUE_TODAY":
                due_today_count += 1
            elif urgency == "UPCOMING":
                upcoming_count += 1

            inst_name = c.institution.name if c.institution else f"Institution #{c.institution_id}"
            officer_name = c.assignee.full_name if c.assignee else "Unassigned"

            items.append(
                DeadlineItemOut(
                    complaint_id=c.id,
                    complaint_no=c.complaint_no,
                    institution_id=c.institution_id,
                    institution_name=inst_name,
                    assigned_officer_id=c.assigned_to,
                    assigned_officer_name=officer_name,
                    bureau=c.bureau,
                    category=c.category,
                    priority=c.priority or "Medium",
                    status=c.status or "New",
                    deadline_date=c.deadline_date,
                    days_remaining=days_rem,
                    urgency_level=urgency,
                    pending_action=derive_pending_action(c),
                )
            )

        return DeadlinesTelemetryResponse(
            upcoming_count=upcoming_count,
            due_today_count=due_today_count,
            overdue_count=overdue_count,
            total_monitored=len(items),
            items=items,
        )
