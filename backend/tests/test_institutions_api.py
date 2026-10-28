"""
Integration tests for Institutions Directory API (/api/v1/institutions/ and /api/v1/institutions/{id}).
Uses isolated in-memory SQLite database sessions.
"""

from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.dependencies import get_db
from app.main import app
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
    CaseOverlap.__table__.create(engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        CaseOverlap.__table__.drop(engine)
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
