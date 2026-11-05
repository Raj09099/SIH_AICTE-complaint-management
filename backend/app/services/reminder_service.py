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


    @classmethod
    def create_complaint_status_notification(
        cls,
        db: Session,
        complaint: Complaint,
        old_status: Optional[str],
        new_status: str,
        old_bureau: Optional[str] = None,
        new_bureau: Optional[str] = None,
    ) -> Optional[Notification]:
        """
        Generates official complaint-status notifications for the concerned institution (Section 4).
        Triggered when a complaint status changes to:
        - Resolved (Scenario A)
        - Transferred (Scenario B)
        - Under Review (Scenario C)
        - Evidence Requested / Additional Information (Scenario D)
        Enforces strict duplicate prevention, institution scoping, and notification persistence.
        """
        if not complaint or not complaint.institution_id:
            return None

        clean_new_status = (new_status or "").strip().lower()
        clean_old_status = (old_status or "").strip().lower()

        # Check if actual status or bureau transfer occurred
        bureau_transferred = (
            old_bureau is not None
            and new_bureau is not None
            and old_bureau.strip().lower() != new_bureau.strip().lower()
        )
        status_changed = clean_new_status != clean_old_status

        if not status_changed and not bureau_transferred:
            return None

        # Determine notification scenario
        notif_type = None
        title = ""
        message = ""
        urgency = "INFO"
        pending_act = None

        if clean_new_status in ("resolved", "closed"):
            notif_type = "COMPLAINT_RESOLVED"
            title = f"Complaint Resolved: {complaint.complaint_no}"
            message = f"Your complaint {complaint.complaint_no} ('{complaint.subject}') has been successfully resolved by AICTE."
            urgency = "INFO"
            pending_act = "Review Resolution Summary"
        elif clean_new_status == "transferred" or bureau_transferred:
            notif_type = "COMPLAINT_TRANSFERRED"
            target_bureau = (complaint.bureau or new_bureau or "Target Bureau").strip()
            title = f"Complaint Transferred: {complaint.complaint_no}"
            message = f"Your complaint {complaint.complaint_no} has been transferred to {target_bureau} for further action."
            urgency = "INFO"
            pending_act = f"Awaiting Acceptance by {target_bureau}"
        elif clean_new_status == "under review":
            notif_type = "COMPLAINT_UNDER_REVIEW"
            target_bureau = (complaint.bureau or "AICTE Bureau").strip()
            title = f"Complaint Under Review: {complaint.complaint_no}"
            message = f"Your complaint {complaint.complaint_no} is currently under official review by {target_bureau}."
            urgency = "INFO"
            pending_act = "Statutory Bureau Inquiry in Progress"
        elif clean_new_status in ("evidence requested", "additional info requested"):
            notif_type = "COMPLAINT_ADDITIONAL_INFO_REQUESTED"
            target_bureau = (complaint.bureau or "AICTE Bureau").strip()
            title = f"Additional Information Required: {complaint.complaint_no}"
            message = f"AICTE {target_bureau} has requested additional compliance affidavits / evidence records for complaint {complaint.complaint_no}. Please submit the requested information promptly."
            urgency = "WARNING"
            pending_act = "Submit Requested Compliance Documents"
        elif clean_new_status == "new":
            notif_type = "COMPLAINT_REGISTERED"
            title = f"New Grievance Registered: {complaint.complaint_no}"
            message = f"Grievance {complaint.complaint_no} ('{complaint.subject}') has been registered on the AICTE Portal and indexed for bureau evaluation."
            urgency = "INFO"
            pending_act = "Awaiting Initial Bureau Screening"
        else:
            notif_type = f"STATUS_{clean_new_status.upper().replace(' ', '_')}"
            title = f"Complaint Status Updated: {complaint.complaint_no}"
            message = f"Status for complaint {complaint.complaint_no} has been updated to {new_status}."
            urgency = "INFO"
            pending_act = derive_pending_action(complaint)

        # Find target user for this institution
        inst_user = (
            db.query(User)
            .filter(
                User.institution_id == complaint.institution_id,
                User.role == "institute",
            )
            .first()
        )
        target_user_id = inst_user.id if inst_user else (complaint.assigned_to or 1)
        today_val = date.today()

        existing = (
            db.query(Notification)
            .filter(
                Notification.complaint_id == complaint.id,
                Notification.notification_type == notif_type,
                Notification.reminder_date == today_val,
            )
            .first()
        )
        if existing:
            return existing

        notif = Notification(
            user_id=target_user_id,
            institution_id=complaint.institution_id,
            complaint_id=complaint.id,
            title=title,
            message=message,
            notification_type=notif_type,
            reminder_date=today_val,
            urgency_level=urgency,
            pending_action=pending_act,
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(notif)
        try:
            db.commit()
            db.refresh(notif)
            logger.info(
                "Created institution complaint notification: %s (Type: %s, Inst: %s)",
                notif.title,
                notif_type,
                complaint.institution_id,
            )
            return notif
        except Exception as err:
            db.rollback()
            logger.error("Failed to persist complaint status notification: %s", err)
            return None
