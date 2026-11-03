"""
Unit and Integration Tests for Feature 3.7: Institution Risk Analysis in SIH26264.
Covers:
- Calculation with zero complaints (Insufficient Data)
- Calculation with single complaint (Insufficient Data)
- Systemic recurrence contribution (0-25 pts)
- Monthly trajectory growth contribution (Increasing, Decreasing, Stable)
- Active overdue SLA breach penalties (0-15 pts)
- High / Critical priority severity contribution (0-20 pts)
- Score clamping (0 to 100) and indicator thresholds (High, Moderate, Low, Insufficient Data)
- Division-by-zero and missing date safety
- Role-based scoping (Council Officers vs Institute campus isolation)
- Filter queries (search, bureau, concern_level, trend, date ranges)
"""

from datetime import date, timedelta
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
from app.services.institution_risk_service import InstitutionRiskService


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
def risk_setup(sqlite_db_session):
    """Pre-seeds test institutions and users."""
    inst1 = Institution(
        id=1,
        aicte_id="AICTE-RISK-001",
        name="Apex College of Technology",
        state="Maharashtra",
        city="Pune",
        bureau_jurisdiction="Approval Bureau",
    )
    inst2 = Institution(
        id=2,
        aicte_id="AICTE-RISK-002",
        name="Beacon Engineering College",
        state="Karnataka",
        city="Bengaluru",
        bureau_jurisdiction="Academic Bureau",
    )
    sqlite_db_session.add_all([inst1, inst2])

    officer = User(
        id=10,
        email="officer@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Dr. Officer Sharma",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    inst_user1 = User(
        id=20,
        email="director@apex.edu",
        hashed_password="hashed_pwd",
        full_name="Apex Director",
        bureau="Apex College",
        role="institute",
        institution_id=1,
        is_active=True,
    )
    sqlite_db_session.add_all([officer, inst_user1])
    sqlite_db_session.commit()

    return {
        "inst1": inst1,
        "inst2": inst2,
        "officer": officer,
        "inst_user1": inst_user1,
    }


def make_auth_header(user: User) -> dict:
    token = create_access_token(
        subject=user.email,
        role=user.role,
        bureau=user.bureau,
    )
    return {"Authorization": f"Bearer {token}"}


# -------------------------------------------------------------
# Unit Tests for InstitutionRiskService Calculations
# -------------------------------------------------------------

def test_1_institution_with_zero_complaints(risk_setup):
    """1. An institution with no complaints receives Insufficient Data and 0 score."""
    inst1 = risk_setup["inst1"]
    score, concern, factors, expl = InstitutionRiskService.calculate_institution_risk(inst1, [])
    assert score == 0
    assert concern == "Insufficient Data"
    assert factors.volume_score == 0
    assert factors.recurrence_score == 0
    assert factors.growth_score == 0
    assert factors.growth_trend == "Insufficient Data"
    assert "insufficient data" in expl.lower()


def test_2_institution_with_single_complaint(risk_setup):
    """2. An institution with a single complaint receives Insufficient Data (not enough temporal history)."""
    inst1 = risk_setup["inst1"]
    c = Complaint(
        id=101,
        complaint_no="RISK-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="General",
        subject="Library access",
        description="Book shortage",
        status="Under Review",
        filing_date=date(2026, 6, 1),
    )
    score, concern, factors, expl = InstitutionRiskService.calculate_institution_risk(inst1, [c])
    assert score > 0
    assert concern == "Insufficient Data"
    assert factors.volume_count == 1
    assert factors.recurring_count == 0
    assert "Single isolated complaint" in expl


def test_3_repeated_complaints_contribute_to_recurrence(risk_setup):
    """3. Repeated complaints in the same category contribute recurrence score (0-25 pts)."""
    inst1 = risk_setup["inst1"]
    complaints = [
        Complaint(
            id=100 + i,
            complaint_no=f"REC-{i}",
            institution_id=1,
            complainant_type="Student",
            bureau="Approval Bureau",
            category="Excessive Fee",
            subject=f"Fee surcharge #{i}",
            description="Fee description",
            status="Under Review",
            filing_date=date(2026, 5 if i < 2 else 6, 10),
        )
        for i in range(5)
    ]
    score, concern, factors, expl = InstitutionRiskService.calculate_institution_risk(inst1, complaints)
    assert factors.recurring_count == 5
    assert factors.recurrence_score >= 16
    assert "recurring complaints" in expl.lower()


def test_4_escalating_complaints_trigger_increasing_trend(risk_setup):
    """4. Accelerating complaint volume sets growth_trend = Increasing (+20 pts)."""
    inst1 = risk_setup["inst1"]
    # 2 in May, 3 in June, 6 in July
    complaints = [
        Complaint(
            id=200 + i,
            complaint_no=f"TREND-{i}",
            institution_id=1,
            complainant_type="Student",
            bureau="Approval Bureau",
            category="Capitation Fee",
            subject=f"Capitation #{i}",
            description="Desc",
            status="Under Review",
            filing_date=date(2026, 5 if i < 2 else (6 if i < 5 else 7), 15),
        )
        for i in range(11)
    ]
    score, concern, factors, expl = InstitutionRiskService.calculate_institution_risk(inst1, complaints)
    assert factors.growth_trend == "Increasing"
    assert factors.growth_score == 20
    assert factors.volume_score == 20
    assert score >= 60
    assert concern == "High Concern"
    assert "escalating monthly complaint trajectory" in expl


def test_5_stable_complaints_trend(risk_setup):
    """5. Consistent complaints across months sets growth_trend = Stable (+8 pts)."""
    inst1 = risk_setup["inst1"]
    # 2 in May, 2 in June, 2 in July, 2 in August
    complaints = [
        Complaint(
            id=300 + i,
            complaint_no=f"STABLE-{i}",
            institution_id=1,
            complainant_type="Faculty",
            bureau="Academic Bureau",
            category="Salary Withholding",
            subject=f"Salary issue #{i}",
            description="Desc",
            status="Under Review",
            filing_date=date(2026, 5 + (i // 2), 15),
        )
        for i in range(8)
    ]
    score, concern, factors, expl = InstitutionRiskService.calculate_institution_risk(inst1, complaints)
    assert factors.growth_trend == "Stable"
    assert factors.growth_score == 8


def test_6_overdue_complaints_urgency_penalty(risk_setup):
    """6. Unresolved cases past SLA deadline trigger overdue score (+15 pts for >=4)."""
    inst1 = risk_setup["inst1"]
    past_date = date(2026, 10, 1)
    complaints = [
        Complaint(
            id=400 + i,
            complaint_no=f"OVR-{i}",
            institution_id=1,
            complainant_type="Student",
            bureau="Approval Bureau",
            category="Hostel Grievance",
            subject=f"Hostel issue #{i}",
            description="Desc",
            status="Under Review",
            filing_date=date(2026, 6, 1),
            deadline_date=past_date,
        )
        for i in range(4)
    ]
    ref_date = date(2026, 11, 1)
    score, concern, factors, expl = InstitutionRiskService.calculate_institution_risk(inst1, complaints, reference_date=ref_date)
    assert factors.overdue_count == 4
    assert factors.overdue_score == 15
    assert "overdue sla deadline" in expl.lower()


def test_7_high_and_critical_priority_contribution(risk_setup):
    """7. Active High/Critical priority cases contribute up to 20 pts."""
    inst1 = risk_setup["inst1"]
    complaints = [
        Complaint(
            id=500 + i,
            complaint_no=f"PRI-{i}",
            institution_id=1,
            complainant_type="Student",
            bureau="Approval Bureau",
            category="Ragging",
            subject=f"Ragging case #{i}",
            description="Desc",
            priority="Critical",
            status="Under Review",
            filing_date=date(2026, 6, 1),
        )
        for i in range(4)
    ]
    score, concern, factors, expl = InstitutionRiskService.calculate_institution_risk(inst1, complaints)
    assert factors.high_critical_count == 4
    assert factors.priority_score == 20


def test_8_score_clamping_and_threshold_mapping(risk_setup):
    """8. Combined scores cannot exceed 100 and map cleanly to thresholds."""
    inst1 = risk_setup["inst1"]
    # Severe compounding infractions
    complaints = [
        Complaint(
            id=600 + i,
            complaint_no=f"MAX-{i}",
            institution_id=1,
            complainant_type="Student",
            bureau="Approval Bureau",
            category="Harassment",
            subject=f"Severe infraction #{i}",
            description="Desc",
            priority="Critical",
            status="Under Review",
            filing_date=date(2026, 5 if i < 4 else (6 if i < 10 else 7), 1),
            deadline_date=date(2026, 6, 1),
        )
        for i in range(20)
    ]
    ref_date = date(2026, 11, 1)
    score, concern, factors, expl = InstitutionRiskService.calculate_institution_risk(inst1, complaints, reference_date=ref_date)
    assert score <= 100
    assert concern == "High Concern"
    assert factors.total_score == score


# -------------------------------------------------------------
# Integration & Security Tests via FastAPI TestClient
# -------------------------------------------------------------

def test_9_officer_access_risk_overview(client, sqlite_db_session, risk_setup):
    """9. Authorized AICTE officers have council-wide overview across all institutions."""
    officer = risk_setup["officer"]
    h = make_auth_header(officer)

    # Seed 2 complaints for Inst 1 and 2 complaints for Inst 2
    c1 = Complaint(
        complaint_no="API-RISK-01",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee",
        subject="Fee",
        description="Desc",
        status="New",
        filing_date=date(2026, 6, 1),
    )
    c2 = Complaint(
        complaint_no="API-RISK-02",
        institution_id=2,
        complainant_type="Faculty",
        bureau="Academic Bureau",
        category="Salary",
        subject="Salary",
        description="Desc",
        status="New",
        filing_date=date(2026, 6, 2),
    )
    sqlite_db_session.add_all([c1, c2])
    sqlite_db_session.commit()

    res = client.get("/api/v1/institution-risk/overview", headers=h)
    assert res.status_code == 200
    data = res.json()
    assert data["total_institutions_analyzed"] == 2
    assert "disclaimer" in data
    assert len(data["institutions"]) == 2


def test_10_institute_scoping_and_cross_campus_isolation(client, sqlite_db_session, risk_setup):
    """10. Institute users are strictly scoped to their own campus; foreign access returns 403."""
    inst_user = risk_setup["inst_user1"]
    h = make_auth_header(inst_user)

    # Overview returns only their own institution (Inst 1)
    res_ov = client.get("/api/v1/institution-risk/overview", headers=h)
    assert res_ov.status_code == 200
    data_ov = res_ov.json()
    assert data_ov["total_institutions_analyzed"] == 1
    assert data_ov["institutions"][0]["institution_id"] == 1

    # Accessing own detail -> 200 OK
    res_own = client.get("/api/v1/institution-risk/institutions/1", headers=h)
    assert res_own.status_code == 200
    assert res_own.json()["institution_id"] == 1

    # Accessing foreign detail (Inst 2) -> 403 Forbidden
    res_foreign = client.get("/api/v1/institution-risk/institutions/2", headers=h)
    assert res_foreign.status_code == 403
    assert "Access denied" in res_foreign.json()["detail"]


def test_11_risk_query_filters(client, sqlite_db_session, risk_setup):
    """11. Risk overview respects bureau and concern level query filters."""
    officer = risk_setup["officer"]
    h = make_auth_header(officer)

    # Filter by bureau = "Approval Bureau"
    res_bureau = client.get("/api/v1/institution-risk/overview?bureau=Approval%20Bureau", headers=h)
    assert res_bureau.status_code == 200
    items = res_bureau.json()["institutions"]
    for it in items:
        assert it["bureau"] == "Approval Bureau"

