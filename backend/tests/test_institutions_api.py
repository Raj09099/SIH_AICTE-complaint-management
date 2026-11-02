"""
Integration tests for Institutions Directory API (/api/v1/institutions/ and /api/v1/institutions/{id}).
Uses isolated in-memory SQLite database sessions.
"""

from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.dependencies import get_db
from app.main import app
from app.models.attachment import Attachment
from app.models.case_overlap import CaseOverlap
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.user import User


@pytest.fixture
def sqlite_inst_session():
    """Isolated in-memory SQLite session with institutions, complaints, and users tables."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Institution.__table__.create(engine)
    User.__table__.create(engine)
    Complaint.__table__.create(engine)
    Attachment.__table__.create(engine)
    CaseOverlap.__table__.create(engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        CaseOverlap.__table__.drop(engine)
        Attachment.__table__.drop(engine)
        Complaint.__table__.drop(engine)
        User.__table__.drop(engine)
        Institution.__table__.drop(engine)


@pytest.fixture
def client(sqlite_inst_session):
    def override_get_db():
        try:
            yield sqlite_inst_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_list_institutions_empty_database(client):
    """Verifies that an empty database returns valid empty list with zeros in summary stats."""
    res = client.get("/api/v1/institutions/")
    assert res.status_code == 200
    data = res.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["stats"]["total_institutions"] == 0
    assert data["stats"]["total_complaints"] == 0


def test_list_institutions_populated_with_filters(client, sqlite_inst_session):
    """Verifies search, state filtering, and pagination over seeded institutions."""
    inst1 = Institution(
        id=1,
        aicte_id="1-456789123",
        name="Maharashtra Institute of Technology",
        state="Maharashtra",
        city="Pune",
        institution_type="Engineering College",
        bureau_jurisdiction="Approval Bureau",
    )
    inst2 = Institution(
        id=2,
        aicte_id="1-789123456",
        name="Karnataka National College of Engineering",
        state="Karnataka",
        city="Bengaluru",
        institution_type="Technical University",
        bureau_jurisdiction="Approval Bureau",
    )
    inst3 = Institution(
        id=3,
        aicte_id="1-112233445",
        name="Pune College of Pharmacy",
        state="Maharashtra",
        city="Pune",
        institution_type="Pharmacy Institute",
        bureau_jurisdiction="Academic Bureau",
    )
    sqlite_inst_session.add_all([inst1, inst2, inst3])
    sqlite_inst_session.commit()

    # 1. Test basic listing
    res = client.get("/api/v1/institutions/")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3
    assert data["stats"]["total_institutions"] == 3

    # 2. Test search by name keyword
    res_search = client.get("/api/v1/institutions/?search=Pharmacy")
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1
    assert res_search.json()["items"][0]["aicte_id"] == "1-112233445"

    # 3. Test filter by state
    res_state = client.get("/api/v1/institutions/?state=Karnataka")
    assert res_state.status_code == 200
    assert res_state.json()["total"] == 1
    assert res_state.json()["items"][0]["city"] == "Bengaluru"

    # 4. Test pagination limit and skip
    res_page = client.get("/api/v1/institutions/?limit=2&skip=0")
    assert res_page.status_code == 200
    assert len(res_page.json()["items"]) == 2
    assert res_page.json()["total"] == 3


def test_complaint_aggregations_and_zero_complaints(client, sqlite_inst_session):
    """Verifies that open, resolved, and overdue complaints are accurately calculated per institution."""
    inst_active = Institution(
        id=10,
        aicte_id="1-ACTIVE-01",
        name="Active Grievance Institute",
        state="Delhi",
        city="New Delhi",
    )
    inst_clean = Institution(
        id=20,
        aicte_id="1-CLEAN-01",
        name="Model Exemplary College",
        state="Delhi",
        city="New Delhi",
    )
    sqlite_inst_session.add_all([inst_active, inst_clean])
    sqlite_inst_session.commit()

    today = date.today()
    # Add 1 resolved complaint
    c_resolved = Complaint(
        id=101,
        complaint_no="CMP-R01",
        institution_id=10,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Overcharge",
        subject="Fee Refund Resolved",
        description="Fee was refunded to student",
        status="Resolved",
        filing_date=today - timedelta(days=40),
        deadline_date=today - timedelta(days=10),
    )
    # Add 1 open overdue complaint (deadline in past)
    c_overdue = Complaint(
        id=102,
        complaint_no="CMP-OD01",
        institution_id=10,
        complainant_type="Faculty",
        bureau="Approval Bureau",
        category="Infrastructure",
        subject="Lab deficient",
        description="Lab equipment not available",
        status="Under Review",
        filing_date=today - timedelta(days=35),
        deadline_date=today - timedelta(days=5),
    )
    # Add 1 open on-time complaint (deadline in future)
    c_ontime = Complaint(
        id=103,
        complaint_no="CMP-OT01",
        institution_id=10,
        complainant_type="Parent",
        bureau="Faculty Cell",
        category="Salary",
        subject="Salary arrears",
        description="Salary arrears pending",
        status="New",
        filing_date=today - timedelta(days=5),
        deadline_date=today + timedelta(days=25),
    )
    sqlite_inst_session.add_all([c_resolved, c_overdue, c_ontime])
    sqlite_inst_session.commit()

    # Query list
    res = client.get("/api/v1/institutions/")
    assert res.status_code == 200
    items = {item["id"]: item for item in res.json()["items"]}

    # Verify active institute counts
    active_st = items[10]
    assert active_st["total_complaints"] == 3
    assert active_st["open_complaints"] == 2
    assert active_st["resolved_complaints"] == 1
    assert active_st["overdue_complaints"] == 1

    # Verify clean institute with 0 complaints handles gracefully
    clean_st = items[20]
    assert clean_st["total_complaints"] == 0
    assert clean_st["open_complaints"] == 0
    assert clean_st["resolved_complaints"] == 0
    assert clean_st["overdue_complaints"] == 0


def test_get_institution_details_by_id_and_aicte_id(client, sqlite_inst_session):
    """Verifies GET /api/v1/institutions/{id} supports both integer ID and AICTE Permanent ID."""
    inst = Institution(
        id=5,
        aicte_id="1-PUN-ENG-99",
        name="Symbiosis Technical Campus",
        state="Maharashtra",
        city="Pune",
        institution_type="Private University",
        affiliating_university="Self-Financed",
        bureau_jurisdiction="Approval Bureau",
    )
    sqlite_inst_session.add(inst)
    sqlite_inst_session.commit()

    c = Complaint(
        id=501,
        complaint_no="CMP-501",
        institution_id=5,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Admissions",
        subject="Seat withholding",
        description="Student seat withheld inappropriately",
        status="Under Review",
    )
    sqlite_inst_session.add(c)
    sqlite_inst_session.commit()

    # Lookup by integer ID
    res_int = client.get("/api/v1/institutions/5")
    assert res_int.status_code == 200
    data_int = res_int.json()
    assert data_int["id"] == 5
    assert data_int["aicte_id"] == "1-PUN-ENG-99"
    assert data_int["total_complaints"] == 1
    assert len(data_int["complaints"]) == 1
    assert data_int["complaints"][0]["complaint_no"] == "CMP-501"
    assert "Approval Bureau" in data_int["active_bureaus"]

    # Lookup by AICTE string ID
    res_str = client.get("/api/v1/institutions/1-PUN-ENG-99")
    assert res_str.status_code == 200
    assert res_str.json()["name"] == "Symbiosis Technical Campus"


def test_get_institution_details_not_found(client):
    """Verifies that non-existent institution ID returns 404 with clear error message."""
    res = client.get("/api/v1/institutions/999999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_institution_360_metrics(client, sqlite_inst_session):
    """
    Verifies Feature 1 Institution 360° metrics:
    - pending_complaints (Status == 'New')
    - in_progress_complaints (Status in 'Under Review', 'Evidence Requested', 'Transferred')
    - resolved_complaints (Status == 'Resolved')
    - overdue_complaints (Unresolved with deadline in past)
    - bureau_breakdown (Detailed per-bureau metrics)
    - recurring_categories (Grouped, sorted, recurring flag when count >= 2)
    - sla_compliance_rate (On-time resolution percentage, missing deadlines handled)
    """
    inst = Institution(
        id=77,
        aicte_id="1-360-TEST-01",
        name="Metropolitan Institute of Technology",
        state="Maharashtra",
        city="Mumbai",
        institution_type="Engineering College",
        bureau_jurisdiction="Approval Bureau",
    )
    sqlite_inst_session.add(inst)
    sqlite_inst_session.commit()

    today = date.today()

    # 1. Pending (New)
    c1 = Complaint(
        id=701,
        complaint_no="CMP-360-01",
        institution_id=77,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Overcharge",
        subject="Exam fee surcharge",
        description="Non-sanctioned exam surcharge",
        status="New",
        filing_date=today - timedelta(days=2),
        deadline_date=today + timedelta(days=28),
    )

    # 2. In Progress & Overdue (Under Review, deadline in past)
    c2 = Complaint(
        id=702,
        complaint_no="CMP-360-02",
        institution_id=77,
        complainant_type="Faculty",
        bureau="Approval Bureau",
        category="Fee Overcharge",
        subject="Capitation deposit",
        description="Capitation fee demanded",
        status="Under Review",
        filing_date=today - timedelta(days=45),
        deadline_date=today - timedelta(days=15),
    )

    # 3. In Progress (Evidence Requested)
    c3 = Complaint(
        id=703,
        complaint_no="CMP-360-03",
        institution_id=77,
        complainant_type="Student",
        bureau="Anti-Ragging Cell",
        category="Hostel Harassment",
        subject="Hostel harassment issue",
        description="Hostel harassment reported",
        status="Evidence Requested",
        filing_date=today - timedelta(days=10),
        deadline_date=today + timedelta(days=20),
    )

    # 4. In Progress (Transferred)
    c4 = Complaint(
        id=704,
        complaint_no="CMP-360-04",
        institution_id=77,
        complainant_type="Student",
        bureau="Anti-Ragging Cell",
        category="Hostel Harassment",
        subject="Verbal intimidation",
        description="Verbal intimidation in dining hall",
        status="Transferred",
        filing_date=today - timedelta(days=8),
        deadline_date=today + timedelta(days=22),
    )

    # 5. Resolved ON-TIME (updated_at <= deadline_date)
    c5 = Complaint(
        id=705,
        complaint_no="CMP-360-05",
        institution_id=77,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Overcharge",
        subject="Library deposit refund",
        description="Library security refund issue",
        status="Resolved",
        filing_date=today - timedelta(days=25),
        deadline_date=today + timedelta(days=5),
        updated_at=datetime.combine(today - timedelta(days=2), datetime.min.time(), tzinfo=timezone.utc),
    )

    # 6. Resolved OVERDUE (updated_at > deadline_date)
    c6 = Complaint(
        id=706,
        complaint_no="CMP-360-06",
        institution_id=77,
        complainant_type="Public",
        bureau="Approval Bureau",
        category="Infrastructure Deficit",
        subject="Lab ventilation",
        description="Chemistry lab ventilation deficient",
        status="Resolved",
        filing_date=today - timedelta(days=60),
        deadline_date=today - timedelta(days=30),
        updated_at=datetime.combine(today - timedelta(days=5), datetime.min.time(), tzinfo=timezone.utc),
    )

    # 7. Resolved with MISSING deadline (must not count as on-time)
    c7 = Complaint(
        id=707,
        complaint_no="CMP-360-07",
        institution_id=77,
        complainant_type="Parent",
        bureau="Approval Bureau",
        category="Infrastructure Deficit",
        subject="Fire safety inspection",
        description="Fire clearance certificate missing",
        status="Resolved",
        filing_date=today - timedelta(days=20),
        deadline_date=None,
        updated_at=datetime.combine(today - timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc),
    )

    # 8. Resolved with MISSING resolution date (updated_at is None)
    # Must NOT automatically use filing_date or count as on-time
    c8 = Complaint(
        id=708,
        complaint_no="CMP-360-08",
        institution_id=77,
        complainant_type="Faculty",
        bureau="Approval Bureau",
        category="Infrastructure Deficit",
        subject="Power backup",
        description="UPS generator backup required",
        status="Resolved",
        filing_date=today - timedelta(days=15),
        deadline_date=today + timedelta(days=15),
        updated_at=None,
    )

    sqlite_inst_session.add_all([c1, c2, c3, c4, c5, c6, c7, c8])
    sqlite_inst_session.commit()

    # Explicitly clear updated_at for c8 to simulate a record with missing resolution timestamp
    from sqlalchemy import text
    sqlite_inst_session.execute(text("UPDATE complaints SET updated_at = NULL WHERE id = 708"))
    sqlite_inst_session.commit()

    res = client.get("/api/v1/institutions/77")
    assert res.status_code == 200
    data = res.json()

    # Core Counts
    assert data["total_complaints"] == 8
    assert data["pending_complaints"] == 1
    assert data["in_progress_complaints"] == 3
    assert data["resolved_complaints"] == 4
    assert data["overdue_complaints"] == 1
    assert data["open_complaints"] == 4

    # SLA Compliance Rate: Only c5 is on-time out of 4 resolved = 25.0%
    # (c6 was overdue, c7 had missing deadline, c8 had missing resolution date)
    assert data["sla_compliance_rate"] == 25.0

    # Bureau Breakdown Verification
    b_map = {b["bureau"]: b for b in data["bureau_breakdown"]}
    assert "Approval Bureau" in b_map
    assert "Anti-Ragging Cell" in b_map

    appr = b_map["Approval Bureau"]
    assert appr["total"] == 6
    assert appr["open"] == 2
    assert appr["resolved"] == 4
    assert appr["overdue"] == 1

    rag = b_map["Anti-Ragging Cell"]
    assert rag["total"] == 2
    assert rag["open"] == 2
    assert rag["resolved"] == 0
    assert rag["overdue"] == 0

    # Recurring Categories Verification
    cat_map = {c["category"]: c for c in data["recurring_categories"]}
    assert len(cat_map) == 3

    # Fee Overcharge: 3 complaints (3/8 = 37.5%) -> Recurring
    fee = cat_map["Fee Overcharge"]
    assert fee["count"] == 3
    assert fee["percentage"] == 37.5
    assert fee["is_recurring"] is True

    # Infrastructure Deficit: 3 complaints (3/8 = 37.5%) -> Recurring
    infra = cat_map["Infrastructure Deficit"]
    assert infra["count"] == 3
    assert infra["percentage"] == 37.5
    assert infra["is_recurring"] is True

    # Hostel Harassment: 2 complaints (2/8 = 25.0%) -> Recurring
    hostel = cat_map["Hostel Harassment"]
    assert hostel["count"] == 2
    assert hostel["percentage"] == 25.0
    assert hostel["is_recurring"] is True


def test_institution_360_empty_metrics(client, sqlite_inst_session):
    """Verifies that an institution with zero complaints returns clean zeros and empty collections."""
    inst = Institution(
        id=88,
        aicte_id="1-ZERO-COMPLAINT-01",
        name="Zero Grievance Institute",
        state="Goa",
        city="Panaji",
    )
    sqlite_inst_session.add(inst)
    sqlite_inst_session.commit()

    res = client.get("/api/v1/institutions/88")
    assert res.status_code == 200
    data = res.json()

    assert data["total_complaints"] == 0
    assert data["pending_complaints"] == 0
    assert data["in_progress_complaints"] == 0
    assert data["resolved_complaints"] == 0
    assert data["overdue_complaints"] == 0
    assert data["open_complaints"] == 0
    assert data["sla_compliance_rate"] == 0.0
    assert data["bureau_breakdown"] == []
    assert data["recurring_categories"] == []
    assert data["complaints"] == []
    assert data["active_bureaus"] == []
    assert data["category_distribution"] == {}



def test_institute_role_blocked_from_institutions_directory(client, sqlite_inst_session):
    """
    Acceptance check 2: Calling /institutions/ with an institute token returns 403 Forbidden.
    """
    from app.core.security import create_access_token
    inst_user = User(
        id=77,
        email="inst.rep@college.edu.in",
        hashed_password="hash",
        full_name="College Rep",
        bureau="Engineering College",
        role="institute",
        institution_id=1,
        is_active=True,
    )
    sqlite_inst_session.add(inst_user)
    sqlite_inst_session.commit()

    token = create_access_token(
        subject=inst_user.email, role="institute", bureau="Engineering College", institution_id=1
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Calling institutions directory with institute token must return 403 Forbidden!
    res = client.get("/api/v1/institutions/", headers=headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

    # Calling other institution dossier must also return 403 Forbidden!
    inst2 = Institution(id=2, aicte_id="1-002", name="Other Univ", state="DL", city="Delhi")
    sqlite_inst_session.add(inst2)
    sqlite_inst_session.commit()

    res_other = client.get("/api/v1/institutions/2", headers=headers)
    assert res_other.status_code == 403
