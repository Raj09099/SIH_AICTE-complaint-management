"""
Integration and Unit tests for Feature 2: Multi-Institution Problem Pattern Detector.
Tests NLP text preprocessing, TF-IDF cosine similarity, cross-institution clustering,
single-institution exclusion, configurable thresholds, empty and malformed input handling,
and API authentication & authorization.
Uses isolated in-memory SQLite database sessions.
"""

from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.dependencies import get_db
from app.main import app
from app.ml.pattern_detector import ProblemPatternDetector
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.user import User


# ==============================================================================
# Database & Authentication Fixtures
# ==============================================================================

@pytest.fixture
def sqlite_pattern_session():
    """
    Creates an isolated in-memory SQLite database and session for pattern testing.
    """
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
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
def auth_headers(sqlite_pattern_session):
    """Generates valid Bearer authentication headers for an active officer."""
    officer = User(
        id=1,
        email="officer@aicte-india.org",
        hashed_password="hash",
        full_name="Dr. S. Sharma",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    sqlite_pattern_session.add(officer)
    sqlite_pattern_session.commit()
    token = create_access_token(subject=officer.email, role="officer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def viewer_auth_headers(sqlite_pattern_session):
    """Generates valid Bearer authentication headers for a read-only viewer."""
    viewer = User(
        id=2,
        email="viewer@aicte-india.org",
        hashed_password="hash",
        full_name="Viewer User",
        bureau="Approval Bureau",
        role="viewer",
        is_active=True,
    )
    sqlite_pattern_session.add(viewer)
    sqlite_pattern_session.commit()
    token = create_access_token(subject=viewer.email, role="viewer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def inactive_auth_headers(sqlite_pattern_session):
    """Generates Bearer authentication headers for a deactivated officer."""
    inactive = User(
        id=3,
        email="inactive@aicte-india.org",
        hashed_password="hash",
        full_name="Inactive Officer",
        bureau="Approval Bureau",
        role="officer",
        is_active=False,
    )
    sqlite_pattern_session.add(inactive)
    sqlite_pattern_session.commit()
    token = create_access_token(subject=inactive.email, role="officer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def pattern_client(sqlite_pattern_session):
    """FastAPI TestClient wired to isolated in-memory SQLite database."""
    def override_get_db():
        try:
            yield sqlite_pattern_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def seed_pattern_data(sqlite_pattern_session):
    """Seeds multi-institution complaints with known thematic groupings."""
    inst1 = Institution(id=1, aicte_id="1-001", name="Apex Institute of Technology", state="Maharashtra", city="Pune")
    inst2 = Institution(id=2, aicte_id="1-002", name="Beacon Engineering College", state="Karnataka", city="Bengaluru")
    inst3 = Institution(id=3, aicte_id="1-003", name="Crest Polytechnic", state="Tamil Nadu", city="Chennai")
    sqlite_pattern_session.add_all([inst1, inst2, inst3])
    sqlite_pattern_session.commit()

    # Theme A: Capitation fees / admission extortion across 3 institutions
    c1 = Complaint(
        id=1,
        complaint_no="CMP-FEE-01",
        institution_id=1,
        complainant_type="Parent",
        bureau="Approval Bureau",
        category="Fee Irregularities",
        subject="Demanding illegal capitation fee for engineering admission",
        description="Management is demanding 2 lakh cash capitation fees without receipt for management quota admission.",
        filing_date=date(2026, 1, 10),
        status="New",
        priority="Urgent",
    )
    c2 = Complaint(
        id=2,
        complaint_no="CMP-FEE-02",
        institution_id=2,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Irregularities",
        subject="Extortion of capitation fees and unapproved admission charges",
        description="Administration demanding Rs 150000 capitation fees and non approved building funds during admission.",
        filing_date=date(2026, 1, 20),
        status="Under Review",
        priority="High",
    )
    c3 = Complaint(
        id=3,
        complaint_no="CMP-FEE-03",
        institution_id=3,
        complainant_type="Anonymous",
        bureau="Approval Bureau",
        category="Fee Irregularities",
        subject="Illegal capitation fee collection during direct admission process",
        description="Authorities asking for cash capitation donation without receipts before issuing seat allotment.",
        filing_date=date(2026, 2, 5),
        status="New",
        priority="High",
    )

    # Theme B: Faculty salary unpaid (only in Institution 1 - single institution only!)
    c4 = Complaint(
        id=4,
        complaint_no="CMP-FAC-01",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Faculty & Staff Grievances Cell",
        category="Faculty Grievance",
        subject="Non payment of assistant professor salaries for 5 months",
        description="Mechanical engineering professors have not received monthly salaries since August 2025.",
        filing_date=date(2026, 2, 10),
        status="New",
        priority="Critical",
    )
    c5 = Complaint(
        id=5,
        complaint_no="CMP-FAC-02",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Faculty & Staff Grievances Cell",
        category="Faculty Grievance",
        subject="Unpaid faculty salary arrears in civil department",
        description="Assistant professors unpaid for consecutive months with salaries withheld by director.",
        filing_date=date(2026, 2, 15),
        status="New",
        priority="High",
    )

    # Unrelated complaint in different category
    c6 = Complaint(
        id=6,
        complaint_no="CMP-INF-01",
        institution_id=2,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Infrastructure",
        subject="Broken bench and non-working water cooler in library",
        description="Second floor library lacks drinking water cooler and benches are broken.",
        filing_date=date(2026, 1, 15),
        status="New",
        priority="Low",
    )

    sqlite_pattern_session.add_all([c1, c2, c3, c4, c5, c6])
    sqlite_pattern_session.commit()


# ==============================================================================
# Unit Tests: ProblemPatternDetector ML Module
# ==============================================================================

def test_multi_institution_pattern_formation():
    """Requirement: Similar complaints from different institutions form a pattern."""
    detector = ProblemPatternDetector(default_threshold=0.25, min_institutions=2)
    complaints = [
        {
            "id": 1,
            "complaint_no": "C-1",
            "institution_id": 10,
            "category": "Fee Irregularities",
            "subject": "Extortion of capitation fees during direct admission",
            "description": "College demanded 2 lakhs donation cash without receipt for direct admission seat.",
            "filing_date": date(2026, 1, 15),
        },
        {
            "id": 2,
            "complaint_no": "C-2",
            "institution_id": 20,
            "category": "Fee Irregularities",
            "subject": "Illegal capitation fee and unapproved donations",
            "description": "Administration is charging capitation fee and cash donations without receipts.",
            "filing_date": date(2026, 1, 20),
        },
        {
            "id": 3,
            "complaint_no": "C-3",
            "institution_id": 30,
            "category": "Fee Irregularities",
            "subject": "Capitation fee extortion for management quota",
            "description": "Demanding cash capitation fee without receipt violating AICTE guidelines.",
            "filing_date": date(2026, 2, 1),
        },
    ]

    inst_map = {
        10: {"id": 10, "aicte_id": "INST-10", "name": "College 10", "state": "Delhi"},
        20: {"id": 20, "aicte_id": "INST-20", "name": "College 20", "state": "Haryana"},
        30: {"id": 30, "aicte_id": "INST-30", "name": "College 30", "state": "Punjab"},
    }

    patterns = detector.discover_patterns(complaints, institutions_map=inst_map, threshold=0.25)
    assert len(patterns) == 1
    p = patterns[0]
    assert p["affected_institutions_count"] == 3
    assert p["complaint_count"] == 3
    assert p["category"] == "Fee Irregularities"
    assert "capitation" in " ".join(p["keywords"]).lower() or "admission" in " ".join(p["keywords"]).lower() or "fee" in " ".join(p["keywords"]).lower()
    assert p["cluster_score"] > 0.0
    assert len(p["affected_institutions"]) == 3


def test_single_institution_alone_does_not_qualify():
    """Requirement: Complaints from one institution alone do NOT qualify as a cross-institution pattern."""
    detector = ProblemPatternDetector(default_threshold=0.30, min_institutions=2)
    # 4 complaints, but all from institution_id=10!
    complaints = [
        {
            "id": 1,
            "institution_id": 10,
            "category": "Hostel",
            "subject": "Hostel warden demanding non sanctioned fees",
            "description": "Warden is coercing hostel students for maintenance deposit.",
        },
        {
            "id": 2,
            "institution_id": 10,
            "category": "Hostel",
            "subject": "Hostel amenity charge extortion",
            "description": "Warden demands non approved hostel charges without receipts.",
        },
        {
            "id": 3,
            "institution_id": 10,
            "category": "Hostel",
            "subject": "Hostel deposit coercion by warden",
            "description": "Hostel residents forced to pay non sanctioned deposit.",
        },
    ]

    patterns = detector.discover_patterns(complaints, min_institutions=2)
    assert len(patterns) == 0, "Single institution complaints must never form a multi-institution pattern"


def test_unrelated_complaints_not_grouped_at_configured_threshold():
    """Requirement: Unrelated complaints are not grouped at threshold."""
    detector = ProblemPatternDetector(default_threshold=0.60, min_institutions=2)
    complaints = [
        {
            "id": 1,
            "institution_id": 10,
            "category": "General",
            "subject": "Hostel mess food quality is substandard",
            "description": "Vegetables served in mess are stale and water purifier is broken.",
        },
        {
            "id": 2,
            "institution_id": 20,
            "category": "General",
            "subject": "Faculty salary arrears unpaid for four months",
            "description": "Assistant professors have not received monthly pay disbursements.",
        },
    ]

    patterns = detector.discover_patterns(complaints, threshold=0.60)
    assert len(patterns) == 0


def test_empty_and_malformed_datasets_handled_gracefully():
    """Requirement: Empty datasets, short texts, and missing metadata handled gracefully."""
    detector = ProblemPatternDetector()

    # Empty list
    assert detector.discover_patterns([]) == []

    # Single item (less than min_institutions)
    assert detector.discover_patterns([{"id": 1, "institution_id": 5}]) == []

    # Complaints with None or empty fields
    malformed = [
        {"id": 1, "institution_id": 1, "category": None, "subject": "", "description": ""},
        {"id": 2, "institution_id": 2, "category": None, "subject": "   ", "description": None},
    ]
    assert detector.discover_patterns(malformed) == []


# ==============================================================================
# API Integration Tests: /api/v1/patterns
# ==============================================================================

def test_api_list_patterns_unauthenticated_fails_with_401(pattern_client):
    """Unauthenticated request to list patterns returns HTTP 401."""
    res = pattern_client.get("/api/v1/patterns")
    assert res.status_code == 401
    assert "WWW-Authenticate" in res.headers


def test_api_list_patterns_invalid_token_fails_with_401(pattern_client):
    """Invalid token returns HTTP 401."""
    res = pattern_client.get(
        "/api/v1/patterns",
        headers={"Authorization": "Bearer forged-or-invalid-token"},
    )
    assert res.status_code == 401


def test_api_list_patterns_inactive_user_fails_with_401(pattern_client, inactive_auth_headers):
    """Deactivated user returns HTTP 401."""
    res = pattern_client.get("/api/v1/patterns", headers=inactive_auth_headers)
    assert res.status_code == 401


def test_api_list_patterns_viewer_can_read(pattern_client, viewer_auth_headers, seed_pattern_data):
    """Viewer role is permitted to read discovered problem patterns."""
    res = pattern_client.get("/api/v1/patterns", headers=viewer_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "patterns" in data
    assert "total" in data
    assert data["total"] >= 1

    # Verify single-institution complaints (Faculty Grievance) were EXCLUDED
    pattern_categories = [p["category"] for p in data["patterns"]]
    assert "Faculty Grievance" not in pattern_categories, "Single-institution complaints must not qualify"
    assert "Fee Irregularities" in pattern_categories


def test_api_run_clustering_viewer_forbidden_with_403(pattern_client, viewer_auth_headers):
    """Read-only viewer cannot trigger clustering mutation/pipeline."""
    res = pattern_client.post(
        "/api/v1/patterns/run-clustering",
        json={"threshold": 0.40, "min_institutions": 2},
        headers=viewer_auth_headers,
    )
    assert res.status_code == 403


def test_api_run_clustering_authorized_officer_success(
    pattern_client, auth_headers, seed_pattern_data
):
    """Authorized officer can trigger pattern clustering pipeline with custom parameters."""
    res = pattern_client.post(
        "/api/v1/patterns/run-clustering",
        json={
            "threshold": 0.25,
            "min_institutions": 2,
            "min_complaints": 2,
            "category": "Fee Irregularities",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    pattern = data["patterns"][0]
    assert pattern["pattern_code"] == "PAT-001"
    assert pattern["affected_institutions_count"] == 3
    assert pattern["complaint_count"] == 3
    assert len(pattern["affected_institutions"]) == 3
    assert len(pattern["complaints"]) == 3
    assert pattern["trend_direction"] in ("Stable", "Surging", "Emerging", "Declining")


def test_api_get_pattern_by_code_success_and_not_found(
    pattern_client, auth_headers, seed_pattern_data
):
    """Fetching pattern by code returns details or 404 if absent."""
    # 1. Fetch valid pattern
    res = pattern_client.get(
        "/api/v1/patterns/PAT-001?threshold=0.25",
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["pattern_code"] == "PAT-001"
    assert data["category"] == "Fee Irregularities"

    # 2. Non-existent pattern
    res_404 = pattern_client.get(
        "/api/v1/patterns/PAT-999?threshold=0.25",
        headers=auth_headers,
    )
    assert res_404.status_code == 404
