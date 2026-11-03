"""
Unit and Integration Tests for Feature 3.5: AI-Assisted Priority System in SIH26264.
Covers:
- Transparent multi-factor scoring (Severity, Ageing, Deadline SLA, Escalation)
- High-severity & safety violation detection
- Overdue & approaching deadline urgency penalties
- Resolved complaint exclusion handling
- Missing deadline handling
- Officer decision workflows: Accept recommendation & Manual override
- Role-based permissions: Institute role forbidden from override/accept (403)
- Decision history preservation and audit logs
- Priority monitoring dashboard metrics & discrepancy detection
"""

from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.dependencies import get_db
from app.main import app
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.priority_recommendation import PriorityRecommendation
from app.models.user import User
from app.services.priority_service import PriorityService


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
    PriorityRecommendation.__table__.create(engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        PriorityRecommendation.__table__.drop(engine)
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
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def priority_setup(sqlite_db_session):
    """Pre-seeds test institution and users."""
    inst = Institution(
        id=1,
        aicte_id="AICTE-PRI-001",
        name="Trinity Institute of Engineering",
        state="Maharashtra",
        city="Mumbai",
    )
    sqlite_db_session.add(inst)

    officer = User(
        id=10,
        email="officer@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Dr. S. Sharma",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    inst_user = User(
        id=20,
        email="principal@trinity.edu",
        hashed_password="hashed_pwd",
        full_name="Trinity Principal",
        bureau="Trinity Institute",
        role="institute",
        institution_id=1,
        is_active=True,
    )
    sqlite_db_session.add_all([officer, inst_user])
    sqlite_db_session.commit()

    return {
        "institution": inst,
        "officer": officer,
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

def test_1_high_severity_ragging_safety_complaint(priority_setup):
    """1. Anti-ragging or physical threat complaint yields Critical/High priority."""
    c = Complaint(
        id=1,
        complaint_no="PRI-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Anti-Ragging Cell",
        category="Anti-Ragging",
        subject="Hostel ragging incident",
        description="Physical threats and severe harassment in hostel premises",
        priority="Medium",
        status="Under Review",
        filing_date=date(2026, 10, 1),
        deadline_date=date(2026, 11, 10),
    )
    score, rec_priority, factors, reason = PriorityService.evaluate_priority_factors(
        c, reference_date=date(2026, 11, 2)
    )

    assert factors.severity_score >= 40
    assert rec_priority in ("Critical", "High")
    assert "Ragging" in reason or "Safety" in reason


def test_2_overdue_complaint_receives_urgency_penalty(priority_setup):
    """2. Overdue complaints receive maximum SLA penalty points."""
    today = date(2026, 11, 2)
    c = Complaint(
        id=2,
        complaint_no="PRI-002",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Surcharge",
        subject="Excessive fee",
        description="Capitation fee demanded",
        priority="Medium",
        status="Under Review",
        filing_date=today - timedelta(days=40),
        deadline_date=today - timedelta(days=15), # Overdue by 15 days
    )
    score, rec_priority, factors, reason = PriorityService.evaluate_priority_factors(
        c, reference_date=today
    )

    assert factors.deadline_status == "Overdue"
    assert factors.deadline_score == 30
    assert rec_priority in ("Critical", "High")


def test_3_approaching_deadline_urgency_bonus(priority_setup):
    """3. Deadlines approaching in <= 3 days receive urgency bonus."""
    today = date(2026, 11, 2)
    c = Complaint(
        id=3,
        complaint_no="PRI-003",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Examination",
        subject="Exam schedule dispute",
        description="Hall ticket withheld",
        priority="Medium",
        status="Under Review",
        filing_date=today - timedelta(days=10),
        deadline_date=today + timedelta(days=2), # 2 days remaining
    )
    score, rec_priority, factors, reason = PriorityService.evaluate_priority_factors(
        c, reference_date=today
    )

    assert factors.deadline_status == "Approaching (<= 3d)"
    assert factors.deadline_score == 15


def test_4_long_pending_ageing_score(priority_setup):
    """4. Long pending complaints (> 60 days) receive maximum ageing score."""
    today = date(2026, 11, 2)
    c = Complaint(
        id=4,
        complaint_no="PRI-004",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Administration Cell",
        category="Faculty Salaries",
        subject="Unpaid arrears",
        description="Six months pending salary",
        priority="Medium",
        status="Under Review",
        filing_date=today - timedelta(days=75), # 75 days pending
        deadline_date=today + timedelta(days=20),
    )
    score, rec_priority, factors, reason = PriorityService.evaluate_priority_factors(
        c, reference_date=today
    )

    assert factors.ageing_days == 75
    assert factors.ageing_score == 25


def test_5_resolved_complaint_assigned_zero_score(priority_setup):
    """5. Resolved and closed complaints receive Low priority and 0 score."""
    c = Complaint(
        id=5,
        complaint_no="PRI-005",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Ragging",
        subject="Ragging",
        description="Closed case",
        priority="High",
        status="Resolved",
        filing_date=date(2026, 5, 1),
    )
    score, rec_priority, factors, reason = PriorityService.evaluate_priority_factors(c)
    assert score == 0
    assert rec_priority == "Low"


def test_6_missing_deadline_handled_safely(priority_setup):
    """6. Complaints with NULL deadline_date evaluate safely without crashing."""
    c = Complaint(
        id=6,
        complaint_no="PRI-006",
        institution_id=1,
        complainant_type="Public",
        bureau="Approval Bureau",
        category="General",
        subject="Inquiry",
        description="Question about admission norm",
        priority="Medium",
        status="New",
        filing_date=date(2026, 10, 1),
        deadline_date=None, # Missing deadline
    )
    score, rec_priority, factors, reason = PriorityService.evaluate_priority_factors(c)
    assert factors.deadline_status == "Missing Deadline"
    assert rec_priority in ("Medium", "Low")


def test_7_officer_accept_recommendation(client, sqlite_db_session, priority_setup):
    """7. Officer accepting recommendation updates complaint priority and sets status 'Accepted'."""
    today = date(2026, 11, 2)
    c = Complaint(
        complaint_no="ACT-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Severe Harassment",
        subject="Extortion and safety threats",
        description="Detailed description",
        priority="Low", # Initial priority is Low
        status="Under Review",
        filing_date=today - timedelta(days=35),
        deadline_date=today - timedelta(days=5),
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()

    officer = priority_setup["officer"]
    h = make_auth_header(officer)

    res = client.post(f"/api/v1/priority/complaints/{c.id}/accept", headers=h)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Accepted"
    assert data["final_priority"] in ("Critical", "High")

    # Verify complaint record in database was updated
    sqlite_db_session.refresh(c)
    assert c.priority == data["final_priority"]


def test_8_officer_override_recommendation(client, sqlite_db_session, priority_setup):
    """8. Officer can override priority with a chosen level and justification note."""
    c = Complaint(
        complaint_no="OVR-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Library Issues",
        subject="Book availability",
        description="Desc",
        priority="Low",
        status="New",
        filing_date=date(2026, 10, 15),
        deadline_date=date(2026, 11, 15),
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()

    officer = priority_setup["officer"]
    h = make_auth_header(officer)

    override_payload = {
        "new_priority": "Critical",
        "justification": "Vice Chancellor requested immediate escalation hearing.",
    }
    res = client.post(
        f"/api/v1/priority/complaints/{c.id}/override",
        json=override_payload,
        headers=h,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Overridden"
    assert data["final_priority"] == "Critical"
    assert "Vice Chancellor" in data["decision_notes"]

    # Verify complaint priority was updated in database
    sqlite_db_session.refresh(c)
    assert c.priority == "Critical"


def test_9_institute_user_cannot_override_or_accept(client, sqlite_db_session, priority_setup):
    """9. Institute accounts are forbidden (403) from accepting or overriding recommendations."""
    c = Complaint(
        complaint_no="SEC-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee",
        subject="Fee",
        description="Desc",
        priority="Medium",
        status="New",
        filing_date=date(2026, 10, 1),
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()

    inst_user = priority_setup["inst_user"]
    h_inst = make_auth_header(inst_user)

    # Attempt accept -> 403 Forbidden
    res_acc = client.post(f"/api/v1/priority/complaints/{c.id}/accept", headers=h_inst)
    assert res_acc.status_code == 403

    # Attempt override -> 403 Forbidden
    res_ovr = client.post(
        f"/api/v1/priority/complaints/{c.id}/override",
        json={"new_priority": "Low", "justification": "Institute wants low priority"},
        headers=h_inst,
    )
    assert res_ovr.status_code == 403


def test_10_decision_history_preservation(client, sqlite_db_session, priority_setup):
    """10. Decision history is logged and retrievable via audit trail endpoint."""
    c = Complaint(
        complaint_no="HIST-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Harassment",
        subject="Extortion",
        description="Desc",
        priority="Medium",
        status="Under Review",
        filing_date=date(2026, 10, 1),
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()

    officer = priority_setup["officer"]
    h = make_auth_header(officer)

    # First accept
    client.post(f"/api/v1/priority/complaints/{c.id}/accept", headers=h)

    # Then fetch history
    res_hist = client.get(f"/api/v1/priority/complaints/{c.id}/history", headers=h)
    assert res_hist.status_code == 200
    logs = res_hist.json()
    assert len(logs) >= 1
    assert logs[0]["status"] == "Accepted"
    assert logs[0]["decided_by_name"] == "Dr. S. Sharma"


def test_11_priority_dashboard_discrepancy_detection(client, sqlite_db_session, priority_setup):
    """11. Dashboard telemetry flags discrepancies where assigned priority < recommended."""
    today = date(2026, 11, 2)
    # Severe ragging case assigned "Low" priority -> Discrepancy!
    c = Complaint(
        complaint_no="DISC-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Anti-Ragging Cell",
        category="Severe Ragging and Violence",
        subject="Hostel violence",
        description="Physical battery and assault",
        priority="Low", # Severely under-ranked
        status="Under Review",
        filing_date=today - timedelta(days=20),
        deadline_date=today - timedelta(days=5),
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()

    officer = priority_setup["officer"]
    h = make_auth_header(officer)

    res = client.get("/api/v1/priority/dashboard?discrepancy_only=true", headers=h)
    assert res.status_code == 200
    dash = res.json()
    assert dash["discrepancy_count"] >= 1
    assert any(rec["complaint_no"] == "DISC-001" and rec["has_discrepancy"] for rec in dash["recommendations"])

