"""
Unit and Integration Tests for Feature 3.4: Recurrence Radar in SIH26264.
Covers:
- Trend classification (Increasing, Decreasing, Stable, Insufficient Data)
- Systemic recurrence detection (repeated categories >= 2 complaints)
- Month-by-month trajectory aggregation
- Missing date and edge case handling
- Role-based data isolation (Institute vs Officer)
- API endpoint integration
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
from app.services.recurrence_service import RecurrenceService


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
def recurrence_setup(sqlite_db_session):
    """Pre-seeds test institutions and authorized users."""
    inst1 = Institution(
        id=1,
        aicte_id="AICTE-REC-001",
        name="Apex College of Engineering",
        state="Maharashtra",
        city="Pune",
        bureau_jurisdiction="Approval Bureau",
    )
    inst2 = Institution(
        id=2,
        aicte_id="AICTE-REC-002",
        name="Beacon Institute of Technology",
        state="Karnataka",
        city="Bengaluru",
        bureau_jurisdiction="Academic Bureau",
    )
    sqlite_db_session.add_all([inst1, inst2])

    officer = User(
        id=10,
        email="officer@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Dr. S. Sharma",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    inst_user1 = User(
        id=20,
        email="dean@apex.edu",
        hashed_password="hashed_pwd",
        full_name="Apex Principal",
        bureau="Apex College",
        role="institute",
        institution_id=1,
        is_active=True,
    )
    inst_user2 = User(
        id=30,
        email="dean@beacon.edu",
        hashed_password="hashed_pwd",
        full_name="Beacon Principal",
        bureau="Beacon Institute",
        role="institute",
        institution_id=2,
        is_active=True,
    )
    sqlite_db_session.add_all([officer, inst_user1, inst_user2])
    sqlite_db_session.commit()

    return {
        "inst1": inst1,
        "inst2": inst2,
        "officer": officer,
        "inst_user1": inst_user1,
        "inst_user2": inst_user2,
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

def test_1_trend_classification_increasing():
    """1. Increasing volume over time is correctly classified as 'Increasing'."""
    # Growing monthly count: month 1 = 2, month 2 = 5, month 3 = 12
    monthly_data = {"2026-05": 2, "2026-06": 5, "2026-07": 12}
    trend = RecurrenceService.classify_trend(monthly_data)
    assert trend == "Increasing"


def test_2_trend_classification_decreasing():
    """2. Declining volume over time is correctly classified as 'Decreasing'."""
    # Declining monthly count: month 1 = 15, month 2 = 7, month 3 = 1
    monthly_data = {"2026-05": 15, "2026-06": 7, "2026-07": 1}
    trend = RecurrenceService.classify_trend(monthly_data)
    assert trend == "Decreasing"


def test_3_trend_classification_stable():
    """3. Steady volume over time is correctly classified as 'Stable'."""
    # Steady counts: 5, 5, 5
    monthly_data = {"2026-05": 5, "2026-06": 5, "2026-07": 5}
    trend = RecurrenceService.classify_trend(monthly_data)
    assert trend == "Stable"


def test_4_trend_classification_insufficient_data():
    """4. Single data point or zero data returns 'Insufficient Data'."""
    assert RecurrenceService.classify_trend({}) == "Insufficient Data"
    assert RecurrenceService.classify_trend({"2026-05": 3}) == "Insufficient Data"


def test_5_repeated_category_detection(sqlite_db_session, recurrence_setup):
    """5. Same category reported >= 2 times within an institution is flagged as recurring."""
    # Seed 2 Fee Overcharging complaints for Inst 1
    c1 = Complaint(
        complaint_no="REC-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Overcharging",
        subject="Non-sanctioned fee charged",
        description="Detailed description",
        status="Under Review",
        filing_date=date(2026, 5, 10),
    )
    c2 = Complaint(
        complaint_no="REC-002",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Overcharging",
        subject="Additional exam fee",
        description="Detailed description",
        status="New",
        filing_date=date(2026, 6, 12),
    )
    # Seed 1 single isolated complaint for Inst 1
    c3 = Complaint(
        complaint_no="REC-003",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Academic Bureau",
        category="Infrastructure",
        subject="Library repair needed",
        description="Detailed description",
        status="New",
        filing_date=date(2026, 6, 15),
    )
    sqlite_db_session.add_all([c1, c2, c3])
    sqlite_db_session.commit()

    officer = recurrence_setup["officer"]
    overview = RecurrenceService.get_recurrence_overview(sqlite_db_session, user=officer)

    assert overview.total_complaints_analyzed == 3
    assert overview.total_recurring_complaints == 2
    assert overview.institutions_with_recurrence == 1

    inst_row = next((it for it in overview.institutions if it.institution_id == 1), None)
    assert inst_row is not None
    assert inst_row.recurring_complaints_count == 2
    assert inst_row.primary_recurring_category == "Fee Overcharging"


def test_6_escalating_institution_surveillance(sqlite_db_session, recurrence_setup):
    """6. Accelerating complaint volume across multiple months sets Increasing trend."""
    # Inst 1 receives escalating complaints across 3 months
    complaints = [
        Complaint(
            complaint_no=f"ESC-{i}",
            institution_id=1,
            complainant_type="Student",
            bureau="Approval Bureau",
            category="Excessive Fee",
            subject=f"Fee complaint #{i}",
            description="Fee surcharge",
            status="Under Review",
            filing_date=date(2026, 5 if i < 2 else (6 if i < 5 else 7), 15),
        )
        for i in range(10) # 2 in May, 3 in June, 5 in July
    ]
    sqlite_db_session.add_all(complaints)
    sqlite_db_session.commit()

    officer = recurrence_setup["officer"]
    overview = RecurrenceService.get_recurrence_overview(sqlite_db_session, user=officer)

    inst_row = next((it for it in overview.institutions if it.institution_id == 1), None)
    assert inst_row is not None
    assert inst_row.trend == "Increasing"
    assert overview.escalating_institutions_count == 1


def test_7_missing_filing_dates_handled_safely(sqlite_db_session, recurrence_setup):
    """7. Complaints with NULL filing_date are grouped safely without crashing."""
    c = Complaint(
        complaint_no="NULL-DATE-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Hostel Deficit",
        subject="Water shortage",
        description="Detailed description",
        status="New",
        filing_date=None, # Missing date
    )
    sqlite_db_session.add(c)
    sqlite_db_session.commit()

    officer = recurrence_setup["officer"]
    overview = RecurrenceService.get_recurrence_overview(sqlite_db_session, user=officer)
    assert overview.total_complaints_analyzed == 1


def test_8_institution_role_scoping_isolation(client, sqlite_db_session, recurrence_setup):
    """8. Institute accounts can only inspect recurrence for their own college."""
    inst_user1 = recurrence_setup["inst_user1"]
    inst_user2 = recurrence_setup["inst_user2"]

    # Seed complaints for Inst 1 and Inst 2
    c1 = Complaint(
        complaint_no="INST1-C01",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Capitation Fee",
        subject="Fee",
        description="Desc",
        status="New",
        filing_date=date(2026, 5, 1),
    )
    c2 = Complaint(
        complaint_no="INST2-C01",
        institution_id=2,
        complainant_type="Faculty",
        bureau="Academic Bureau",
        category="Salary",
        subject="Salary",
        description="Desc",
        status="New",
        filing_date=date(2026, 5, 2),
    )
    sqlite_db_session.add_all([c1, c2])
    sqlite_db_session.commit()

    # Institute User 1 calls overview -> Only Inst 1 data is returned
    h1 = make_auth_header(inst_user1)
    res1 = client.get("/api/v1/recurrence/overview", headers=h1)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["institutions_monitored"] == 1
    assert data1["institutions"][0]["institution_id"] == 1

    # Institute User 1 tries to access Inst 2 details -> 403 Forbidden
    res_forbidden = client.get("/api/v1/recurrence/institution/2", headers=h1)
    assert res_forbidden.status_code == 403

    # Institute User 1 accesses Inst 1 details -> 200 OK
    res_allowed = client.get("/api/v1/recurrence/institution/1", headers=h1)
    assert res_allowed.status_code == 200
    assert res_allowed.json()["institution_id"] == 1


def test_9_recurrence_api_filters(client, sqlite_db_session, recurrence_setup):
    """9. Recurrence overview honors category and bureau filters."""
    c1 = Complaint(
        complaint_no="FILT-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Overcharging",
        subject="Fee issue",
        description="Desc",
        status="New",
        filing_date=date(2026, 6, 1),
    )
    c2 = Complaint(
        complaint_no="FILT-002",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Academic Bureau",
        category="Curriculum Delay",
        subject="Curriculum issue",
        description="Desc",
        status="New",
        filing_date=date(2026, 6, 2),
    )
    sqlite_db_session.add_all([c1, c2])
    sqlite_db_session.commit()

    officer = recurrence_setup["officer"]
    h = make_auth_header(officer)

    # Filter by bureau = Approval Bureau
    res_bureau = client.get("/api/v1/recurrence/overview?bureau=Approval%20Bureau", headers=h)
    assert res_bureau.status_code == 200
    assert res_bureau.json()["total_complaints_analyzed"] == 1

    # Filter by category = Fee Overcharging
    res_cat = client.get("/api/v1/recurrence/overview?category=Fee%20Overcharging", headers=h)
    assert res_cat.status_code == 200
    assert res_cat.json()["total_complaints_analyzed"] == 1


def test_10_ai_agglomerative_clustering_fee_refund_grouping():
    """10. TF-IDF + Cosine Similarity + Agglomerative Clustering groups semantically similar complaints."""
    c1 = Complaint(
        id=101,
        complaint_no="CMP-FEE-01",
        institution_id=1,
        complainant_type="Student",
        category="Fee Overcharging",
        subject="Non refund of admission caution money deposit",
        description="The college administration refuses to refund my 15000 caution deposit after cancellation.",
    )
    c2 = Complaint(
        id=102,
        complaint_no="CMP-FEE-02",
        institution_id=1,
        complainant_type="Student",
        category="Fee Overcharging",
        subject="Refund of admission security deposit not given",
        description="I cancelled admission within statutory window but caution deposit refund has not been transferred.",
    )
    c3 = Complaint(
        id=103,
        complaint_no="CMP-INFRA-01",
        institution_id=1,
        complainant_type="Faculty",
        category="Infrastructure",
        subject="Broken lab equipment in mechanical workshop",
        description="Lathe machines in mechanical lab require urgent replacement of gear drives.",
    )

    clusters, recurring_ids = RecurrenceService.cluster_institution_complaints([c1, c2, c3])

    # Fee refund complaints should be grouped into an AI cluster
    assert len(clusters) >= 1
    top_cluster = clusters[0]
    assert top_cluster.complaint_count == 2
    assert 101 in top_cluster.complaint_ids
    assert 102 in top_cluster.complaint_ids
    assert 103 not in top_cluster.complaint_ids
    assert top_cluster.cohesion_score > 0.30
    assert 101 in recurring_ids and 102 in recurring_ids
    assert 103 not in recurring_ids


def test_11_ai_agglomerative_clustering_detail_endpoint(client, sqlite_db_session, recurrence_setup):
    """11. Institution detail response includes AI-discovered recurring problem clusters."""
    c1 = Complaint(
        id=201,
        complaint_no="REC-AI-01",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Excessive Surcharges",
        subject="Excessive exam and development fee charged",
        description="College is charging 25000 unapproved development fee.",
        status="Under Review",
        filing_date=date(2026, 6, 1),
    )
    c2 = Complaint(
        id=202,
        complaint_no="REC-AI-02",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Excessive Surcharges",
        subject="Unapproved development and exam fee surcharges",
        description="Students forced to pay extra 25000 development fee or blocked from exams.",
        status="Under Review",
        filing_date=date(2026, 6, 15),
    )
    sqlite_db_session.add_all([c1, c2])
    sqlite_db_session.commit()

    officer = recurrence_setup["officer"]
    h = make_auth_header(officer)

    res = client.get("/api/v1/recurrence/institution/1", headers=h)
    assert res.status_code == 200
    data = res.json()

    assert data["institution_id"] == 1
    assert data["recurring_complaints_count"] >= 2
    assert "ai_clusters" in data
    assert len(data["ai_clusters"]) >= 1
    cluster = data["ai_clusters"][0]
    assert cluster["complaint_count"] == 2
    assert cluster["cohesion_score"] > 0.0


