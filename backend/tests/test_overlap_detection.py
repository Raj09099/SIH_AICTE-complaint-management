"""
Integration and Unit tests for Feature 1: Smart Case Overlap and Relationship Detection.
Tests text preprocessing, TF-IDF cosine similarity, metadata weighting,
self-match exclusion, configurable thresholds, API endpoints, and reviewer determinations.
Uses isolated in-memory SQLite database sessions.
"""

from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.dependencies import get_db
from app.main import app
from app.ml.overlap_detector import ComplaintOverlapDetector
from app.ml.text_preprocessing import ComplaintTextPreprocessor
from app.models.case_overlap import CaseOverlap
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.user import User


@pytest.fixture
def auth_headers(sqlite_overlap_session):
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
    sqlite_overlap_session.add(officer)
    sqlite_overlap_session.commit()
    token = create_access_token(subject=officer.email, role="officer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def viewer_auth_headers(sqlite_overlap_session):
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
    sqlite_overlap_session.add(viewer)
    sqlite_overlap_session.commit()
    token = create_access_token(subject=viewer.email, role="viewer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def inactive_auth_headers(sqlite_overlap_session):
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
    sqlite_overlap_session.add(inactive)
    sqlite_overlap_session.commit()
    token = create_access_token(subject=inactive.email, role="officer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sqlite_overlap_session():
    """
    Creates an isolated in-memory SQLite database and session for testing overlap pipeline.
    """
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Institution.__table__.create(test_engine)
    User.__table__.create(test_engine)
    Complaint.__table__.create(test_engine)
    CaseOverlap.__table__.create(test_engine)

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        CaseOverlap.__table__.drop(test_engine)
        Complaint.__table__.drop(test_engine)
        User.__table__.drop(test_engine)
        Institution.__table__.drop(test_engine)


@pytest.fixture
def client(sqlite_overlap_session):
    def override_get_db():
        try:
            yield sqlite_overlap_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


# ==============================================================================
# Unit Tests: Preprocessing & Similarity Scoring
# ==============================================================================

def test_preprocessor_cleaning_and_tokenization():
    """Verifies that preprocessor strips disclaimers, lowercases, and removes stopwords."""
    p = ComplaintTextPreprocessor()
    text = "Students in hostel [DISCLAIMER: Synthetic evaluation] demanding Rs 20,000 amenity fee!!"
    cleaned = p.clean_text(text)
    assert "disclaimer" not in cleaned
    assert "synthetic" not in cleaned
    assert "hostel" in cleaned
    assert "amenity" in cleaned

    tokens = p.tokenize_and_filter(text)
    assert "hostel" in tokens
    assert "amenity" in tokens
    # Stopwords excluded
    assert "and" not in tokens
    assert "the" not in tokens


def test_similarity_scoring_exact_and_near_duplicates():
    """Verifies actual scikit-learn TF-IDF cosine similarity calculations."""
    detector = ComplaintOverlapDetector(default_threshold=0.60)

    # 1. Identical texts -> similarity = 1.0
    text1 = "Hostel warden demanding non sanctioned amenity fee of Rs 20000 under threat of suspension."
    sim_exact, keywords_exact = detector.compute_pairwise_text_similarity(text1, text1)
    assert sim_exact == 1.0
    assert "hostel" in keywords_exact

    # 2. Near duplicates -> high similarity
    text2 = "Hostel warden charging non sanctioned amenity fees 20000 threatening suspension from college."
    sim_near, keywords_near = detector.compute_pairwise_text_similarity(text1, text2)
    assert sim_near >= 0.40
    assert "hostel" in keywords_near

    # 3. Completely dissimilar complaints -> similarity ~ 0.0
    text3 = "Electronics faculty unpaid for five consecutive months salary arrears."
    sim_dissimilar, _ = detector.compute_pairwise_text_similarity(text1, text3)
    assert sim_dissimilar == 0.0


def test_self_match_exclusion():
    """Requirement 4: Exclude self-matches and avoid presenting a complaint as its own duplicate."""
    detector = ComplaintOverlapDetector(default_threshold=0.50)
    c1 = {
        "id": 101,
        "complaint_no": "CMP-101",
        "institution_id": 5,
        "bureau": "Approval Bureau",
        "category": "Fee",
        "subject": "Arbitrary fees",
        "description": "Arbitrary fees charged",
    }

    # Comparing same complaint must return None
    res = detector.compare_pair(c1, c1)
    assert res is None


def test_configurable_threshold():
    """Requirement 5: Test both similar and dissimilar pairs with configurable threshold."""
    detector = ComplaintOverlapDetector()
    c1 = {
        "id": 1,
        "complaint_no": "C-1",
        "institution_id": 1,
        "bureau": "Anti-Ragging Cell",
        "category": "Ragging",
        "subject": "Hostel extortion and ragging",
        "description": "Senior students demanding amenity fees and intimidating juniors in campus hostel.",
    }
    c2 = {
        "id": 2,
        "complaint_no": "C-2",
        "institution_id": 1,
        "bureau": "Approval Bureau",
        "category": "Fees",
        "subject": "Hostel amenity fee surcharge",
        "description": "Hostel administration demanding non-sanctioned amenity surcharge under threat.",
    }

    # Pair matches with threshold 0.50
    match_low = detector.compare_pair(c1, c2, threshold=0.30)
    assert match_low is not None
    assert match_low["overlap_type"] == "Cross-Bureau Related"
    assert "Cross-bureau filing" in match_low["reason"]

    # If threshold is set to 0.99, pair is excluded
    match_strict = detector.compare_pair(c1, c2, threshold=0.99)
    assert match_strict is None


# ==============================================================================
# API Integration Tests: Detection, Listing, and Reviewer Determinations
# ==============================================================================

def test_api_detect_and_persist_overlaps(client, sqlite_overlap_session, auth_headers):
    """Verifies POST /api/v1/overlap/detect runs ML analysis and persists flagged pairs."""
    inst = Institution(id=1, aicte_id="1-INST-01", name="Apex Engineering", state="Maharashtra", city="Pune")
    sqlite_overlap_session.add(inst)
    sqlite_overlap_session.commit()

    # Seed 2 similar complaints (same institution, cross-bureau) and 1 dissimilar complaint
    c1 = Complaint(
        id=1,
        complaint_no="CMP-001",
        institution_id=1,
        complainant_type="Student",
        bureau="Anti-Ragging Cell",
        category="Hostel Ragging",
        subject="Hostel amenities surcharge and senior intimidation",
        description="Senior hostel residents and warden demanding arbitrary 20000 amenity fee with threats of suspension.",
        status="New",
    )
    c2 = Complaint(
        id=2,
        complaint_no="CMP-002",
        institution_id=1,
        complainant_type="Parent",
        bureau="Approval Bureau",
        category="Excessive Fee Surcharges",
        subject="Non-sanctioned 20000 hostel amenity surcharge collected",
        description="Hostel administration is charging an unauthorized 20000 extra fee under special amenities surcharge.",
        status="Under Review",
    )
    c3 = Complaint(
        id=3,
        complaint_no="CMP-003",
        institution_id=1,
        complainant_type="Faculty",
        bureau="Faculty Cell",
        category="Salary Arrears",
        subject="Non-payment of faculty salary for 4 months",
        description="Engineering faculty unpaid since June 2026 violating 7th CPC scale norms.",
        status="New",
    )
    sqlite_overlap_session.add_all([c1, c2, c3])
    sqlite_overlap_session.commit()

    # 1. Trigger detection with persist=True
    detect_res = client.post(
        "/api/v1/overlap/detect",
        json={"threshold": 0.40, "persist": True},
        headers=auth_headers,
    )
    assert detect_res.status_code == 200
    data = detect_res.json()
    assert data["detected_count"] >= 1
    assert data["persisted_count"] >= 1

    first_pair = data["pairs"][0]
    assert first_pair["status"] == "Flagged"
    assert first_pair["overlap_type"] == "Cross-Bureau Related"
    assert len(first_pair["matching_keywords"]) > 0
    assert "Cross-bureau filing" in first_pair["reason"]

    # 2. Verify persistence in case_overlaps database table
    persisted = sqlite_overlap_session.query(CaseOverlap).first()
    assert persisted is not None
    assert persisted.status == "Flagged"
    assert float(persisted.similarity_score) >= 0.40


def test_api_list_flagged_overlaps(client, sqlite_overlap_session):
    """Verifies GET /api/v1/overlap/flagged and GET /api/v1/overlap/ filtering."""
    inst = Institution(id=2, aicte_id="1-INST-02", name="National Tech", state="Punjab", city="Ludhiana")
    sqlite_overlap_session.add(inst)
    sqlite_overlap_session.commit()

    c1 = Complaint(
        id=10,
        complaint_no="CMP-010",
        institution_id=2,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Labs",
        subject="Robotics Lab Non-Functional",
        description="Robotics equipment claimed in approval portal is not installed.",
        status="New",
    )
    c2 = Complaint(
        id=11,
        complaint_no="CMP-011",
        institution_id=2,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Labs",
        subject="Robotics Lab Deficiencies",
        description="Robotics equipment claimed in AICTE portal is missing or broken.",
        status="New",
    )
    sqlite_overlap_session.add_all([c1, c2])
    sqlite_overlap_session.commit()

    overlap = CaseOverlap(
        id=1,
        primary_complaint_id=10,
        related_complaint_id=11,
        similarity_score=Decimal("0.8920"),
        overlap_type="Semantic Duplicate",
        reason="High semantic similarity in robotics laboratory deficiencies.",
        matching_keywords=["robotics", "laboratory", "equipment"],
        status="Flagged",
    )
    sqlite_overlap_session.add(overlap)
    sqlite_overlap_session.commit()

    # Query /flagged
    res = client.get("/api/v1/overlap/flagged")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["id"] == 1
    assert items[0]["similarity_score"] == 0.892
    assert items[0]["primary_complaint"]["complaint_no"] == "CMP-010"
    assert items[0]["related_complaint"]["complaint_no"] == "CMP-011"

    # Query by ID
    res_single = client.get("/api/v1/overlap/1")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == 1


def test_api_reviewer_determination_binding(client, sqlite_overlap_session, auth_headers):
    """
    Requirement 8: Allow authorized human reviewers to mark a suggested relationship
    as Duplicate, Related, or Unrelated. Never let the algorithm make the final decision automatically.
    """
    inst = Institution(id=3, aicte_id="1-INST-03", name="Delhi Tech", state="Delhi", city="Delhi")
    sqlite_overlap_session.add(inst)
    sqlite_overlap_session.commit()

    c1 = Complaint(
        id=20,
        complaint_no="CMP-020",
        institution_id=3,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fees",
        subject="Exam Fee Surcharge",
        description="Unapproved exam fee surcharge.",
    )
    c2 = Complaint(
        id=21,
        complaint_no="CMP-021",
        institution_id=3,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fees",
        subject="Exam Fee Surcharge Multiple",
        description="Unapproved exam fee surcharge duplicated.",
    )
    sqlite_overlap_session.add_all([c1, c2])
    sqlite_overlap_session.commit()

    overlap = CaseOverlap(
        id=5,
        primary_complaint_id=20,
        related_complaint_id=21,
        similarity_score=Decimal("0.9100"),
        overlap_type="Exact Duplicate",
        reason="Identical exam fee claims.",
        matching_keywords=["exam", "surcharge"],
        status="Flagged",
    )
    sqlite_overlap_session.add(overlap)
    sqlite_overlap_session.commit()

    # 1. Reviewer marks as Duplicate (supplying a spoofed reviewer_id 99999 to test override)
    review_res = client.patch(
        "/api/v1/overlap/5/review",
        json={
            "decision": "Duplicate",
            "notes": "Confirmed duplicate by bureau officer; merge with primary dossier.",
            "reviewer_id": 99999,
        },
        headers=auth_headers,
    )
    assert review_res.status_code == 200
    data = review_res.json()
    assert data["status"] == "Duplicate"
    # Must be derived from authenticated user ID (1), NOT the spoofed 99999
    assert data["reviewed_by"] == 1
    assert data["reviewed_at"] is not None
    assert "Confirmed duplicate by bureau officer" in data["reason"]

    # 2. Reviewer can mark as Related
    review_related = client.patch(
        "/api/v1/overlap/5/review",
        json={"decision": "Related"},
        headers=auth_headers,
    )
    assert review_related.status_code == 200
    assert review_related.json()["status"] == "Related"

    # 3. Reviewer can dismiss as Unrelated
    review_dismiss = client.patch(
        "/api/v1/overlap/5/review",
        json={"decision": "Unrelated"},
        headers=auth_headers,
    )
    assert review_dismiss.status_code == 200
    assert review_dismiss.json()["status"] == "Unrelated"

    # 4. Invalid reviewer decision returns 422
    review_invalid = client.patch(
        "/api/v1/overlap/5/review",
        json={"decision": "InvalidDeterminationWord"},
        headers=auth_headers,
    )
    assert review_invalid.status_code == 422

    # 5. Non-existent overlap returns 404
    review_missing = client.patch(
        "/api/v1/overlap/99999/review",
        json={"decision": "Duplicate"},
        headers=auth_headers,
    )
    assert review_missing.status_code == 404


# ==============================================================================
# Security & Authorization Tests for Overlap Detection Mutation Endpoints
# ==============================================================================

def test_overlap_detect_unauthenticated_fails_with_401(client):
    """Verifies that unauthenticated scan requests receive HTTP 401."""
    res = client.post("/api/v1/overlap/detect", json={"threshold": 0.50})
    assert res.status_code == 401
    assert "authentication required" in res.json()["detail"].lower()


def test_overlap_detect_invalid_token_fails_with_401(client):
    """Verifies that invalid token on detect endpoint returns HTTP 401."""
    res = client.post(
        "/api/v1/overlap/detect",
        json={"threshold": 0.50},
        headers={"Authorization": "Bearer fake_invalid_token"},
    )
    assert res.status_code == 401
    assert "invalid or expired" in res.json()["detail"].lower()


def test_overlap_detect_inactive_user_fails_with_401(client, sqlite_overlap_session, inactive_auth_headers):
    """Verifies that deactivated account token receives HTTP 401 on detect endpoint."""
    res = client.post(
        "/api/v1/overlap/detect",
        json={"threshold": 0.50},
        headers=inactive_auth_headers,
    )
    assert res.status_code == 401
    assert "deactivated" in res.json()["detail"].lower()


def test_overlap_detect_viewer_role_fails_with_403(client, sqlite_overlap_session, viewer_auth_headers):
    """Verifies that read-only viewer role receives HTTP 403 on detect endpoint."""
    res = client.post(
        "/api/v1/overlap/detect",
        json={"threshold": 0.50},
        headers=viewer_auth_headers,
    )
    assert res.status_code == 403
    assert "access denied" in res.json()["detail"].lower()


def test_overlap_review_unauthenticated_fails_with_401(client):
    """Verifies that unauthenticated review determination receives HTTP 401."""
    res = client.patch("/api/v1/overlap/1/review", json={"decision": "Duplicate"})
    assert res.status_code == 401
    assert "authentication required" in res.json()["detail"].lower()


def test_overlap_review_invalid_token_fails_with_401(client):
    """Verifies that invalid token on review determination receives HTTP 401."""
    res = client.patch(
        "/api/v1/overlap/1/review",
        json={"decision": "Duplicate"},
        headers={"Authorization": "Bearer bad_token_123"},
    )
    assert res.status_code == 401
    assert "invalid or expired" in res.json()["detail"].lower()


def test_overlap_review_inactive_user_fails_with_401(client, sqlite_overlap_session, inactive_auth_headers):
    """Verifies that deactivated account token receives HTTP 401 on review endpoint."""
    res = client.patch(
        "/api/v1/overlap/1/review",
        json={"decision": "Duplicate"},
        headers=inactive_auth_headers,
    )
    assert res.status_code == 401
    assert "deactivated" in res.json()["detail"].lower()


def test_overlap_review_viewer_role_fails_with_403(client, sqlite_overlap_session, viewer_auth_headers):
    """Verifies that read-only viewer role receives HTTP 403 on review endpoint."""
    res = client.patch(
        "/api/v1/overlap/1/review",
        json={"decision": "Duplicate"},
        headers=viewer_auth_headers,
    )
    assert res.status_code == 403
    assert "access denied" in res.json()["detail"].lower()


def test_overlap_review_derives_reviewer_from_auth_and_ignores_payload_id(
    client, sqlite_overlap_session, auth_headers
):
    """Requirement 4: Never trust client-supplied reviewer_id; derive strictly from JWT actor."""
    inst = Institution(id=99, aicte_id="1-INST-99", name="Security Tech", state="UP", city="Noida")
    c1 = Complaint(
        id=901,
        complaint_no="CMP-901",
        institution_id=99,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee",
        subject="Spoof Test A",
        description="Description A",
    )
    c2 = Complaint(
        id=902,
        complaint_no="CMP-902",
        institution_id=99,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee",
        subject="Spoof Test B",
        description="Description B",
    )
    overlap = CaseOverlap(
        id=900,
        primary_complaint_id=901,
        related_complaint_id=902,
        similarity_score=Decimal("0.9500"),
        overlap_type="Exact Duplicate",
        status="Flagged",
    )
    sqlite_overlap_session.add_all([inst, c1, c2, overlap])
    sqlite_overlap_session.commit()

    # Pass malicious/spoofed reviewer_id 77777 in request body
    res = client.patch(
        f"/api/v1/overlap/{overlap.id}/review",
        json={"decision": "Duplicate", "reviewer_id": 77777},
        headers=auth_headers,
    )
    assert res.status_code == 200
    # Must be 1 (authenticated officer ID from auth_headers), NEVER 77777
    assert res.json()["reviewed_by"] == 1
