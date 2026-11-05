"""
Unit and Integration Tests for Feature 3.3: Automatic Reminder and Deadline System.
Uses isolated in-memory SQLite database sessions.
Zero mutation to live production/Supabase database.
"""
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base
from unittest.mock import patch
from app.core.scheduler import scheduler, shutdown_scheduler, start_scheduler
from app.core.security import create_access_token
from app.dependencies import get_db
from app.main import app
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.user import User
from app.services.reminder_service import ReminderService, derive_pending_action


@pytest.fixture
def sqlite_db_session():
    """Isolated in-memory SQLite database session."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Institution.__table__.create(engine)
    User.__table__.create(engine)
    Complaint.__table__.create(engine)
    Notification.__table__.create(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Notification.__table__.drop(engine)
        Complaint.__table__.drop(engine)
        User.__table__.drop(engine)
        Institution.__table__.drop(engine)


@pytest.fixture
def client(sqlite_db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield sqlite_db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_setup(sqlite_db_session):
    """Creates base institution and officers for testing."""
    inst = Institution(
        id=1,
        aicte_id="AICTE-TEST-001",
        name="Apex Institute of Technology",
        state="Maharashtra",
        city="Pune",
    )
    sqlite_db_session.add(inst)
    officer1 = User(
        id=10,
        email="officer1@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Dr. S. Sharma",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    officer2 = User(
        id=20,
        email="officer2@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Prof. M. Verma",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    inst_user = User(
        id=30,
        email="apex@college.edu",
        hashed_password="hashed_pwd",
        full_name="Apex Principal",
        bureau="Apex Institute",
        role="institute",
        institution_id=1,
        is_active=True,
    )
    sqlite_db_session.add_all([officer1, officer2, inst_user])
    sqlite_db_session.commit()
    return {
        "institution": inst,
        "officer1": officer1,
        "officer2": officer2,
        "inst_user": inst_user,
    }


def make_auth_header(user: User) -> dict:
    token = create_access_token(
        subject=user.email,
        role=user.role,
        bureau=user.bureau,
    )
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# TESTS


# ==============================================================================


def test_1_deadline_exactly_3_days_away(sqlite_db_session, test_setup):
    """1. Reminder generated when deadline is exactly 3 days away."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Surcharges",
        subject="Fee issue",
        description="Detailed description",
        status="Under Review",
        deadline_date=today + timedelta(days=3),
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    res = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res.new_notifications_created == 1
    notif = sqlite_db_session.query(Notification).filter_by(complaint_id=c.id).first()
    assert notif is not None
    assert notif.notification_type == "DEADLINE_APPROACHING_3D"
    assert notif.urgency_level == "WARNING"
    assert notif.user_id == 10
    assert "3 Days Remaining" in notif.title


def test_2_deadline_today(sqlite_db_session, test_setup):
    """2. Reminder generated when deadline is today."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0002",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Approval Bureau",
        category="Salary Arrears",
        subject="Salary dispute",
        description="Detailed description",
        status="Under Review",
        deadline_date=today,
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    res = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res.new_notifications_created == 1
    notif = sqlite_db_session.query(Notification).filter_by(complaint_id=c.id).first()
    assert notif is not None
    assert notif.notification_type == "DEADLINE_TODAY"
    assert notif.urgency_level == "CRITICAL"
    assert "Due Today" in notif.title


def test_3_past_deadline_overdue(sqlite_db_session, test_setup):
    """3. Reminder generated when deadline is past/overdue."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0003",
        institution_id=1,
        complainant_type="Parent",
        bureau="Approval Bureau",
        category="Lab Deficiencies",
        subject="Lab issue",
        description="Detailed description",
        status="Evidence Requested",
        deadline_date=today - timedelta(days=5),
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    res = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res.new_notifications_created == 1
    notif = sqlite_db_session.query(Notification).filter_by(complaint_id=c.id).first()
    assert notif is not None
    assert notif.notification_type == "DEADLINE_OVERDUE"
    assert notif.urgency_level == "CRITICAL"
    assert "5d Overdue" in notif.title


def test_4_resolved_complaint_excluded(sqlite_db_session, test_setup):
    """4. Resolved complaints are completely excluded from reminders."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0004",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Harassment",
        subject="Harassment complaint",
        description="Detailed description",
        status="Resolved",
        deadline_date=today - timedelta(days=2),
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    res = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res.new_notifications_created == 0
    count = sqlite_db_session.query(Notification).filter_by(complaint_id=c.id).count()
    assert count == 0


def test_5_closed_complaint_excluded(sqlite_db_session, test_setup):
    """5. Closed complaints are also excluded from reminders."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0005",
        institution_id=1,
        complainant_type="Public",
        bureau="Approval Bureau",
        category="Admission",
        subject="Admission issue",
        description="Detailed description",
        status="Closed",
        deadline_date=today,
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    res = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res.new_notifications_created == 0


def test_6_missing_deadline_handled_safely(sqlite_db_session, test_setup):
    """6. Complaints with NULL deadline_date do not crash the scheduler."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0006",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Infrastructure",
        subject="Broken bench",
        description="Detailed description",
        status="New",
        deadline_date=None,
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    res = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res.new_notifications_created == 0


def test_7_changed_deadline_updates_status(sqlite_db_session, test_setup):
    """7. Changing a deadline updates the telemetry calculation immediately."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0007",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Scholarship",
        subject="Scholarship issue",
        description="Detailed description",
        status="Under Review",
        deadline_date=today + timedelta(days=10),
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    officer = test_setup["officer1"]
    t1 = ReminderService.get_deadlines_telemetry(sqlite_db_session, user=officer, reference_date=today)
    assert t1.overdue_count == 0

    # Statutory deadline moved to past
    c.deadline_date = today - timedelta(days=1)
    sqlite_db_session.commit()
    t2 = ReminderService.get_deadlines_telemetry(sqlite_db_session, user=officer, reference_date=today)
    assert t2.overdue_count == 1


def test_8_repeated_scheduler_execution_idempotency(sqlite_db_session, test_setup):
    """8. Running the scheduler multiple times on the same day never creates duplicates."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0008",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Surcharges",
        subject="Fee issue",
        description="Detailed description",
        status="Under Review",
        deadline_date=today,
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    res1 = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res1.new_notifications_created == 1

    # Second run on same day
    res2 = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res2.new_notifications_created == 0

    # Third run on same day
    res3 = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    assert res3.new_notifications_created == 0
    total_notifs = sqlite_db_session.query(Notification).filter_by(complaint_id=c.id).count()
    assert total_notifs == 1


def test_9_daily_overdue_reminders(sqlite_db_session, test_setup):
    """9. Overdue complaints receive one reminder per day on consecutive days."""
    day1 = date(2026, 11, 2)
    day2 = date(2026, 11, 3)
    c = Complaint(
        complaint_no="AICTE-2026-0009",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Surcharges",
        subject="Fee issue",
        description="Detailed description",
        status="Under Review",
        deadline_date=date(2026, 10, 30), # Already overdue
        assigned_to=10,
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()

    # Day 1 run
    res1 = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=day1)
    assert res1.new_notifications_created == 1

    # Day 2 run
    res2 = ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=day2)
    assert res2.new_notifications_created == 1

    # Total 2 notifications, each with distinct reminder_date
    notifs = sqlite_db_session.query(Notification).filter_by(complaint_id=c.id).order_by(Notification.reminder_date).all()
    assert len(notifs) == 2
    assert notifs[0].reminder_date == day1
    assert notifs[1].reminder_date == day2


def test_10_correct_officer_assignment(sqlite_db_session, test_setup):
    """10. Notification is created only for the assigned responsible officer."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0010",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Surcharges",
        subject="Fee issue",
        description="Detailed description",
        status="Under Review",
        deadline_date=today,
        assigned_to=20, # Assigned to Officer 2
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)
    notif_off2 = sqlite_db_session.query(Notification).filter_by(user_id=20, complaint_id=c.id).first()
    assert notif_off2 is not None
    notif_off1 = sqlite_db_session.query(Notification).filter_by(user_id=10, complaint_id=c.id).first()
    assert notif_off1 is None


def test_11_unassigned_complaint_handling(sqlite_db_session, test_setup):
    """11. Unassigned complaints do not broadcast notifications to all officers."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="AICTE-2026-0011",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Surcharges",
        subject="Fee issue",
        description="Detailed description",
        status="New",
        deadline_date=today,
        assigned_to=None, # Unassigned
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()
    ReminderService.check_and_generate_reminders(sqlite_db_session, reference_date=today)

    # Neither random officer received a broadcast
    notif_off1 = sqlite_db_session.query(Notification).filter_by(user_id=10, complaint_id=c.id).first()
    notif_off2 = sqlite_db_session.query(Notification).filter_by(user_id=20, complaint_id=c.id).first()
    assert notif_off1 is None
    assert notif_off2 is None


def test_12_notification_access_permissions(client, sqlite_db_session, test_setup):
    """12. Users can only fetch and access their own notifications."""
    officer1 = test_setup["officer1"]
    officer2 = test_setup["officer2"]
    notif = Notification(
        user_id=officer1.id,
        title="Confidential Officer 1 Alert",
        message="Message for Officer 1 only",
        notification_type="GENERAL",
        reminder_date=date.today(),
        urgency_level="INFO",
    )
    sqlite_db_session.add(notif)
    sqlite_db_session.commit()

    # Officer 1 accesses their notifications
    h1 = make_auth_header(officer1)
    r1 = client.get("/api/v1/notifications", headers=h1)
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1["total_count"] == 1
    assert data1["items"][0]["title"] == "Confidential Officer 1 Alert"

    # Officer 2 accesses their notifications -> 0 found
    h2 = make_auth_header(officer2)
    r2 = client.get("/api/v1/notifications", headers=h2)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["total_count"] == 0

    # Officer 2 tries to mark Officer 1's notification as read -> 403 Forbidden
    r_forbidden = client.patch(f"/api/v1/notifications/{notif.id}/read", headers=h2)
    assert r_forbidden.status_code == 403


def test_13_mark_as_read(client, sqlite_db_session, test_setup):
    """13. Mark as read updates is_read flag and read_at timestamp."""
    officer1 = test_setup["officer1"]
    notif = Notification(
        user_id=officer1.id,
        title="Pending Action Alert",
        message="Inspection required",
        notification_type="DEADLINE_TODAY",
        reminder_date=date.today(),
        urgency_level="CRITICAL",
        is_read=False,
    )
    sqlite_db_session.add(notif)
    sqlite_db_session.commit()
    h = make_auth_header(officer1)
    res = client.patch(f"/api/v1/notifications/{notif.id}/read", headers=h)
    assert res.status_code == 200
    data = res.json()
    assert data["is_read"] is True
    assert data["read_at"] is not None


def test_14_unread_notification_count(client, sqlite_db_session, test_setup):
    """14. Unread count endpoint returns accurate count and updates on mark-all-read."""
    officer1 = test_setup["officer1"]
    n1 = Notification(
        user_id=officer1.id,
        title="Alert 1",
        message="Msg 1",
        notification_type="GENERAL",
        reminder_date=date.today(),
        is_read=False,
    )
    n2 = Notification(
        user_id=officer1.id,
        title="Alert 2",
        message="Msg 2",
        notification_type="GENERAL",
        reminder_date=date.today(),
        is_read=False,
    )
    sqlite_db_session.add_all([n1, n2])
    sqlite_db_session.commit()
    h = make_auth_header(officer1)
    r = client.get("/api/v1/notifications/unread-count", headers=h)
    assert r.status_code == 200
    assert r.json()["unread_count"] == 2

    # Mark all read
    r_mark = client.post("/api/v1/notifications/mark-all-read", headers=h)
    assert r_mark.status_code == 200
    assert r_mark.json()["marked_read_count"] == 2

    # Verify unread is now 0
    r_zero = client.get("/api/v1/notifications/unread-count", headers=h)
    assert r_zero.json()["unread_count"] == 0


def test_15_dashboard_metrics_and_pending_action(client, sqlite_db_session, test_setup):
    """15. Dashboard telemetry returns metrics and lifecycle pending action."""
    today = date.today()
    c1 = Complaint(
        complaint_no="AICTE-2026-M001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Overcharging",
        subject="High fees",
        description="Desc",
        status="Evidence Requested",
        deadline_date=today - timedelta(days=2),
        assigned_to=10,
    )
    c2 = Complaint(
        complaint_no="AICTE-2026-M002",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Approval Bureau",
        category="Norms",
        subject="Faculty deficit",
        description="Desc",
        status="Under Review",
        deadline_date=today + timedelta(days=2),
        assigned_to=10,
    )
    sqlite_db_session.add_all([c1, c2])
    sqlite_db_session.commit()
    officer1 = test_setup["officer1"]
    h = make_auth_header(officer1)
    res = client.get("/api/v1/notifications/deadlines", headers=h)
    assert res.status_code == 200
    data = res.json()
    assert data["overdue_count"] >= 1
    assert data["upcoming_count"] >= 1

    # Check pending action derivation
    items = {it["complaint_no"]: it for it in data["items"]}
    assert items["AICTE-2026-M001"]["pending_action"] == "Verify Institutional Compliance Affidavits"
    assert items["AICTE-2026-M002"]["pending_action"] == "Conduct Bureau Inquiry & Assessment"


def test_16_scheduler_lifecycle():
    """16. Scheduler starts and shuts down safely without error."""
    start_scheduler()
    assert scheduler.running is True
    shutdown_scheduler()
    assert scheduler.running is False


def test_17_multiple_scheduler_start_protection():
    """17. Calling start_scheduler multiple times does not register duplicate jobs."""
    start_scheduler()
    initial_jobs_count = len(scheduler.get_jobs())

    # Second start call
    start_scheduler()
    assert len(scheduler.get_jobs()) == initial_jobs_count
    shutdown_scheduler()
