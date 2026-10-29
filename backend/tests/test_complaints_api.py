"""
Integration tests for GET /api/v1/complaints/ endpoint.
Uses isolated in-memory SQLite database sessions and mocks.
Guarantees zero mutation to live production/Supabase databases.
"""

from datetime import date, datetime, timezone
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.dependencies import get_db
from app.main import app
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.user import User


@pytest.fixture
def auth_headers(sqlite_db_session):
    """Generates valid Bearer authentication headers for an active officer."""
    officer = User(
        id=100,
        email="officer.test@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Test Officer",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    sqlite_db_session.add(officer)
    sqlite_db_session.commit()
    token = create_access_token(subject=officer.email, role="officer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def viewer_auth_headers(sqlite_db_session):
    """Generates valid Bearer authentication headers for a viewer role (read-only)."""
    viewer = User(
        id=101,
        email="viewer.test@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Test Viewer",
        bureau="Approval Bureau",
        role="viewer",
        is_active=True,
    )
    sqlite_db_session.add(viewer)
    sqlite_db_session.commit()
    token = create_access_token(subject=viewer.email, role="viewer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def inactive_auth_headers(sqlite_db_session):
    """Generates Bearer authentication headers for a deactivated officer."""
    inactive = User(
        id=102,
        email="inactive.test@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Deactivated Officer",
        bureau="Approval Bureau",
        role="officer",
        is_active=False,
    )
    sqlite_db_session.add(inactive)
    sqlite_db_session.commit()
    token = create_access_token(subject=inactive.email, role="officer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def institute_auth_headers(sqlite_db_session):
    """Generates valid Bearer authentication headers for an institute representative."""
    inst_user = User(
        id=103,
        email="institute.test@apex.edu.in",
        hashed_password="hashed_pwd",
        full_name="Prof. Test (Apex Institute)",
        bureau="Apex Institute",
        role="institute",
        is_active=True,
    )
    sqlite_db_session.add(inst_user)
    sqlite_db_session.commit()
    token = create_access_token(subject=inst_user.email, role="institute", bureau="Apex Institute")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sqlite_db_session():
    """
    Creates an isolated in-memory SQLite database and session for testing.
    Creates only the tables required for complaints testing without ARRAY types.
    """
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Create relevant tables in dependency order
    Institution.__table__.create(test_engine)
    User.__table__.create(test_engine)
    Complaint.__table__.create(test_engine)

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Complaint.__table__.drop(test_engine)
        User.__table__.drop(test_engine)
        Institution.__table__.drop(test_engine)


@pytest.fixture
def client(sqlite_db_session):
    """
    TestClient with get_db overridden to use the isolated SQLite in-memory session.
    """
    def override_get_db():
        try:
            yield sqlite_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_list_complaints_empty_database(client):
    """
    Requirement: Handle an empty database by returning a valid empty response [], not an error.
    """
    # Test with trailing slash
    response = client.get("/api/v1/complaints/")
    assert response.status_code == 200
    assert response.json() == []

    # Test without trailing slash
    response_no_slash = client.get("/api/v1/complaints")
    assert response_no_slash.status_code == 200
    assert response_no_slash.json() == []


def test_list_complaints_with_records(client, sqlite_db_session):
    """
    Requirement: Return complaint records using the response schema and field names.
    """
    # Create parent institution
    inst = Institution(
        id=1,
        aicte_id="1-12345678",
        name="Apex College of Engineering",
        state="Maharashtra",
        city="Pune",
    )
    sqlite_db_session.add(inst)

    # Create complaint
    complaint = Complaint(
        id=1,
        complaint_no="AICTE-2026-0001",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Overcharging",
        subject="Excessive non-refundable laboratory fee charged",
        description="Students asked to pay extra 25000 beyond approved fee structure.",
        priority="High",
        status="Under Review",
        incident_date=date(2026, 10, 1),
        filing_date=date(2026, 10, 5),
        deadline_date=date(2026, 11, 4),
        is_escalated=False,
    )
    sqlite_db_session.add(complaint)
    sqlite_db_session.commit()

    response = client.get("/api/v1/complaints/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1

    item = data[0]
    assert item["id"] == 1
    assert item["complaint_no"] == "AICTE-2026-0001"
    assert item["institution_id"] == 1
    assert item["complainant_type"] == "Student"
    assert item["bureau"] == "Approval Bureau"
    assert item["category"] == "Fee Overcharging"
    assert item["subject"] == "Excessive non-refundable laboratory fee charged"
    assert item["description"] == "Students asked to pay extra 25000 beyond approved fee structure."
    assert item["priority"] == "High"
    assert item["status"] == "Under Review"
    assert item["incident_date"] == "2026-10-01"
    assert item["filing_date"] == "2026-10-05"
    assert item["deadline_date"] == "2026-11-04"
    assert item["is_escalated"] is False
    assert item["assigned_to"] is None
    assert item["resolution_summary"] is None


def test_list_complaints_filters(client, sqlite_db_session):
    """
    Requirement: Support filtering by bureau, status, category, priority, and escalation.
    """
    inst = Institution(id=1, aicte_id="1-9999", name="Test Inst", state="Delhi", city="Delhi")
    sqlite_db_session.add(inst)

    c1 = Complaint(
        id=1,
        complaint_no="C-1",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Issue",
        subject="Fee",
        description="Desc",
        priority="Low",
        status="New",
        is_escalated=False,
    )
    c2 = Complaint(
        id=2,
        complaint_no="C-2",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Faculty Cell",
        category="Salary",
        subject="Salary",
        description="Desc",
        priority="Urgent",
        status="Under Review",
        is_escalated=True,
    )
    sqlite_db_session.add_all([c1, c2])
    sqlite_db_session.commit()

    # Filter by bureau
    res_bureau = client.get("/api/v1/complaints/?bureau=Faculty Cell")
    assert res_bureau.status_code == 200
    assert len(res_bureau.json()) == 1
    assert res_bureau.json()[0]["complaint_no"] == "C-2"

    # Filter by status
    res_status = client.get("/api/v1/complaints/?status=New")
    assert res_status.status_code == 200
    assert len(res_status.json()) == 1
    assert res_status.json()[0]["complaint_no"] == "C-1"

    # Filter by priority
    res_priority = client.get("/api/v1/complaints/?priority=Urgent")
    assert res_priority.status_code == 200
    assert len(res_priority.json()) == 1
    assert res_priority.json()[0]["complaint_no"] == "C-2"

    # Filter by escalation
    res_escalated = client.get("/api/v1/complaints/?is_escalated=true")
    assert res_escalated.status_code == 200
    assert len(res_escalated.json()) == 1
    assert res_escalated.json()[0]["complaint_no"] == "C-2"

    # Filter with no matching records
    res_none = client.get("/api/v1/complaints/?bureau=NonExistentBureau")
    assert res_none.status_code == 200
    assert res_none.json() == []


def test_list_complaints_pagination(client, sqlite_db_session):
    """
    Requirement: Support pagination (skip and limit) compatible with existing design.
    """
    inst = Institution(id=1, aicte_id="1-PAG", name="Pagination Inst", state="UP", city="Noida")
    sqlite_db_session.add(inst)

    for i in range(1, 6):
        sqlite_db_session.add(
            Complaint(
                id=i,
                complaint_no=f"C-PAG-{i}",
                institution_id=1,
                complainant_type="Student",
                bureau="Approval Bureau",
                category="General",
                subject=f"Subject {i}",
                description=f"Description {i}",
            )
        )
    sqlite_db_session.commit()

    # limit 2, skip 0
    res1 = client.get("/api/v1/complaints/?limit=2&skip=0")
    assert res1.status_code == 200
    assert len(res1.json()) == 2

    # limit 2, skip 2
    res2 = client.get("/api/v1/complaints/?limit=2&skip=2")
    assert res2.status_code == 200
    assert len(res2.json()) == 2

    # skip beyond count
    res3 = client.get("/api/v1/complaints/?limit=2&skip=10")
    assert res3.status_code == 200
    assert res3.json() == []


def test_list_complaints_database_error_handling():
    """
    Requirement: Handle database/query errors gracefully by returning HTTP 500.
    """
    mock_db = MagicMock()
    mock_db.query.side_effect = SQLAlchemyError("Simulated PostgreSQL connection failure")

    def override_broken_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_broken_db
    try:
        test_client = TestClient(app)
        response = test_client.get("/api/v1/complaints/")
        assert response.status_code == 500
        assert "Database error occurred while fetching complaints." in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_create_complaint_success(client, sqlite_db_session, auth_headers):
    """Verifies successful complaint creation with validation and persistence."""
    inst = Institution(id=10, aicte_id="1-TEST-10", name="National Engg College", state="Karnataka", city="Bangalore")
    sqlite_db_session.add(inst)
    sqlite_db_session.commit()

    payload = {
        "complaint_no": "AICTE-2026-9999",
        "institution_id": 10,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Fee Overcharging",
        "subject": "Unauthorized Development Fee Collection",
        "description": "College demanded Rs 40,000 for library expansion beyond approved state fee norms.",
        "priority": "High",
        "status": "New",
        "incident_date": "2026-10-10",
        "deadline_date": "2026-11-10",
    }

    response = client.post("/api/v1/complaints/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["complaint_no"] == "AICTE-2026-9999"
    assert data["institution_id"] == 10
    assert data["status"] == "New"
    assert data["priority"] == "High"
    assert data["filing_date"] == date.today().isoformat()
    assert data["deadline_date"] == "2026-11-10"

    # Verify persistence in database session
    persisted = sqlite_db_session.query(Complaint).filter_by(complaint_no="AICTE-2026-9999").first()
    assert persisted is not None
    assert persisted.subject == "Unauthorized Development Fee Collection"


def test_create_complaint_auto_generated_complaint_no(client, sqlite_db_session, auth_headers):
    """Verifies that complaint_no is auto-generated in official AICTE format when omitted."""
    inst = Institution(id=11, aicte_id="1-TEST-11", name="Apex Tech", state="Punjab", city="Ludhiana")
    sqlite_db_session.add(inst)
    sqlite_db_session.commit()

    payload = {
        "institution_id": 11,
        "complainant_type": "Faculty",
        "bureau": "Faculty & Staff Grievances Cell",
        "category": "Salary Arrears",
        "subject": "Delayed Faculty Honorarium",
        "description": "Faculty members unpaid for three months.",
    }

    response = client.post("/api/v1/complaints/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["complaint_no"].startswith("AICTE-")
    assert data["status"] == "New"
    assert data["priority"] == "Medium"
    assert data["deadline_date"] is not None


def test_create_complaint_validation_failures(client, sqlite_db_session, auth_headers):
    """Verifies validation errors for non-existent institution, duplicate numbers, and invalid statuses."""
    inst = Institution(id=12, aicte_id="1-TEST-12", name="Polytechnic Inst", state="Kerala", city="Kochi")
    sqlite_db_session.add(inst)
    sqlite_db_session.commit()

    # 1. Non-existent institution foreign key
    res1 = client.post("/api/v1/complaints/", json={
        "institution_id": 99999,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Lab",
        "subject": "Broken Instruments",
        "description": "Physics lab non-functional",
    }, headers=auth_headers)
    assert res1.status_code == 400
    assert "institution id 99999 does not exist" in res1.json()["detail"].lower()

    # 2. Invalid status
    res2 = client.post("/api/v1/complaints/", json={
        "institution_id": 12,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Lab",
        "subject": "Broken Instruments",
        "description": "Physics lab non-functional",
        "status": "NonExistentStatus",
    }, headers=auth_headers)
    assert res2.status_code == 422

    # 3. Invalid priority
    res3 = client.post("/api/v1/complaints/", json={
        "institution_id": 12,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Lab",
        "subject": "Broken Instruments",
        "description": "Physics lab non-functional",
        "priority": "ExtremeUrgent",
    }, headers=auth_headers)
    assert res3.status_code == 422

    # 4. Duplicate complaint_no
    first_res = client.post("/api/v1/complaints/", json={
        "complaint_no": "AICTE-DUP-001",
        "institution_id": 12,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Lab",
        "subject": "Original Record",
        "description": "Physics lab non-functional",
    }, headers=auth_headers)
    assert first_res.status_code == 201

    dup_res = client.post("/api/v1/complaints/", json={
        "complaint_no": "AICTE-DUP-001",
        "institution_id": 12,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Lab",
        "subject": "Duplicate Record",
        "description": "Physics lab non-functional",
    }, headers=auth_headers)
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"].lower()


def test_get_complaint_by_id_and_tracking_number(client, sqlite_db_session):
    """Verifies fetching complaint by integer ID or official complaint_no string."""
    inst = Institution(id=15, aicte_id="1-TEST-15", name="State Engg", state="Delhi", city="Delhi")
    sqlite_db_session.add(inst)
    sqlite_db_session.commit()

    complaint = Complaint(
        complaint_no="AICTE-2026-FETCH",
        institution_id=15,
        complainant_type="Student",
        bureau="Anti-Ragging Cell",
        category="Hostel Ragging",
        subject="Hostel Security Negligence",
        description="First year students reported harassment by senior students.",
        status="Under Review",
    )
    sqlite_db_session.add(complaint)
    sqlite_db_session.commit()
    sqlite_db_session.refresh(complaint)

    # 1. Fetch by integer ID
    res_id = client.get(f"/api/v1/complaints/{complaint.id}")
    assert res_id.status_code == 200
    assert res_id.json()["complaint_no"] == "AICTE-2026-FETCH"

    # 2. Fetch by complaint_no string
    res_num = client.get("/api/v1/complaints/AICTE-2026-FETCH")
    assert res_num.status_code == 200
    assert res_num.json()["id"] == complaint.id

    # 3. Not found
    res_missing = client.get("/api/v1/complaints/AICTE-DOES-NOT-EXIST")
    assert res_missing.status_code == 404


def test_update_complaint_status_and_transfer(client, sqlite_db_session, auth_headers):
    """Verifies status transitions, resolution summary, and bureau transfers."""
    inst = Institution(id=20, aicte_id="1-TEST-20", name="Govt Tech", state="Goa", city="Panaji")
    sqlite_db_session.add(inst)
    sqlite_db_session.commit()

    complaint = Complaint(
        complaint_no="AICTE-2026-UPDATE",
        institution_id=20,
        complainant_type="Parent",
        bureau="Finance Cell",
        category="Scholarship",
        subject="PMSSS Withholding",
        description="Scholarship not disbursed to beneficiary.",
        status="New",
    )
    sqlite_db_session.add(complaint)
    sqlite_db_session.commit()
    sqlite_db_session.refresh(complaint)

    # 1. Update status to Under Review via PATCH /status
    res1 = client.patch(
        f"/api/v1/complaints/{complaint.complaint_no}/status",
        json={"status": "Under Review", "priority": "High"},
        headers=auth_headers,
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "Under Review"
    assert data1["priority"] == "High"

    # 2. Bureau transfer
    res2 = client.patch(
        f"/api/v1/complaints/{complaint.id}/status",
        json={"status": "Transferred", "bureau": "Approval Bureau"},
        headers=auth_headers,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "Transferred"
    assert data2["bureau"] == "Approval Bureau"

    # 3. Resolve with resolution summary
    res3 = client.patch(
        f"/api/v1/complaints/{complaint.complaint_no}/status",
        json={
            "status": "Resolved",
            "resolution_summary": "Inquiry completed; scholarship arrears released on 28-Oct-2026.",
        },
        headers=auth_headers,
    )
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["status"] == "Resolved"
    assert "Inquiry completed" in data3["resolution_summary"]

    # 4. Invalid status transition returns 422
    res_invalid = client.patch(
        f"/api/v1/complaints/{complaint.id}/status",
        json={"status": "InvalidLifecycleState"},
        headers=auth_headers,
    )
    assert res_invalid.status_code == 422

    # 5. Non-existent complaint returns 404
    res_not_found = client.patch(
        "/api/v1/complaints/99999/status",
        json={"status": "Resolved"},
        headers=auth_headers,
    )
    assert res_not_found.status_code == 404


# ==============================================================================
# Security & Authorization Tests for Complaint Mutation Endpoints
# ==============================================================================

def test_create_complaint_unauthenticated_fails_with_401(client):
    """Verifies that unauthenticated complaint creation attempts return HTTP 401."""
    res = client.post("/api/v1/complaints/", json={
        "institution_id": 1,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Fee",
        "subject": "Unauthenticated Creation Attempt",
        "description": "Should fail with 401",
    })
    assert res.status_code == 401
    assert "authentication required" in res.json()["detail"].lower()


def test_create_complaint_invalid_token_fails_with_401(client):
    """Verifies that requests with invalid/garbage Bearer token return HTTP 401."""
    res = client.post(
        "/api/v1/complaints/",
        json={"institution_id": 1, "complainant_type": "Student"},
        headers={"Authorization": "Bearer invalid_garbage_token_xyz"},
    )
    assert res.status_code == 401
    assert "invalid or expired" in res.json()["detail"].lower()


def test_create_complaint_inactive_user_fails_with_401(client, sqlite_db_session, inactive_auth_headers):
    """Verifies that tokens belonging to deactivated accounts receive HTTP 401."""
    res = client.post(
        "/api/v1/complaints/",
        json={
            "institution_id": 1,
            "complainant_type": "Student",
            "bureau": "Approval Bureau",
            "category": "Fee",
            "subject": "Inactive User Attempt",
            "description": "Should be rejected with 401",
        },
        headers=inactive_auth_headers,
    )
    assert res.status_code == 401
    assert "deactivated" in res.json()["detail"].lower()


def test_create_complaint_viewer_role_fails_with_403(client, sqlite_db_session, viewer_auth_headers):
    """Verifies that authenticated users with read-only 'viewer' role are rejected with HTTP 403."""
    res = client.post(
        "/api/v1/complaints/",
        json={
            "institution_id": 1,
            "complainant_type": "Student",
            "bureau": "Approval Bureau",
            "category": "Fee",
            "subject": "Viewer Role Creation Attempt",
            "description": "Should be rejected with 403",
        },
        headers=viewer_auth_headers,
    )
    assert res.status_code == 403
    assert "access denied" in res.json()["detail"].lower()


def test_update_complaint_status_unauthenticated_fails_with_401(client):
    """Verifies that unauthenticated status updates return HTTP 401."""
    res = client.patch(
        "/api/v1/complaints/AICTE-2026-0001/status",
        json={"status": "Under Review"},
    )
    assert res.status_code == 401
    assert "authentication required" in res.json()["detail"].lower()


def test_update_complaint_status_viewer_role_fails_with_403(client, sqlite_db_session, viewer_auth_headers):
    """Verifies that viewer role cannot modify complaint status (HTTP 403)."""
    res = client.patch(
        "/api/v1/complaints/AICTE-2026-0001/status",
        json={"status": "Under Review"},
        headers=viewer_auth_headers,
    )
    assert res.status_code == 403
    assert "access denied" in res.json()["detail"].lower()


def test_update_complaint_general_unauthenticated_fails_with_401(client):
    """Verifies that unauthenticated general complaint updates return HTTP 401."""
    res = client.patch(
        "/api/v1/complaints/AICTE-2026-0001",
        json={"priority": "Urgent"},
    )
    assert res.status_code == 401
    assert "authentication required" in res.json()["detail"].lower()


def test_update_complaint_general_authorized_success(client, sqlite_db_session, auth_headers):
    """Verifies that authenticated officers can update general complaint fields."""
    inst = Institution(id=30, aicte_id="1-TEST-30", name="Apex South", state="Tamil Nadu", city="Chennai")
    sqlite_db_session.add(inst)
    sqlite_db_session.commit()

    complaint = Complaint(
        complaint_no="AICTE-2026-GENUPD",
        institution_id=30,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Infrastructure",
        subject="Library Books Deficit",
        description="Outdated edition textbooks.",
        status="New",
        priority="Low",
    )
    sqlite_db_session.add(complaint)
    sqlite_db_session.commit()

    res = client.patch(
        f"/api/v1/complaints/{complaint.complaint_no}",
        json={"priority": "Urgent"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["priority"] == "Urgent"



def test_create_complaint_institute_role_success(client, sqlite_db_session):
    """Verifies that an institute user can submit a complaint to the AICTE portal."""
    inst = Institution(
        id=1,
        aicte_id="1-001",
        name="Apex Institute of Technology",
        state="Maharashtra",
        city="Pune",
    )
    sqlite_db_session.add(inst)
    sqlite_db_session.commit()

    inst_user = User(
        id=103,
        email="institute.test@apex.edu.in",
        hashed_password="hashed_pwd",
        full_name="Prof. Test (Apex Institute)",
        bureau="Apex Institute of Technology",
        role="institute",
        is_active=True,
    )
    sqlite_db_session.add(inst_user)
    sqlite_db_session.commit()
    token = create_access_token(subject=inst_user.email, role="institute", bureau="Apex Institute of Technology")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "institution_id": 1,
        "complainant_type": "Institute Representative",
        "bureau": "Approval Bureau",
        "category": "Fee Irregularities",
        "subject": "Institutional Report Regarding Unsanctioned Fee Circular",
        "description": "Submitting formal institutional documentation regarding disputed student fee circular.",
        "priority": "High",
    }
    res = client.post("/api/v1/complaints/", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["complaint_no"].startswith("AICTE-")
    assert data["category"] == "Fee Irregularities"
    assert data["status"] == "New"
