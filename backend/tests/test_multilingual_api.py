"""
Automated Integration and Unit Tests for Feature 3.6: Multilingual Support (English, Hindi, Marathi).
Verifies language detection, non-destructive original text preservation, translation pipeline,
cross-language AI feature vectors, API endpoints, and role authorization isolation.
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
from app.models.attachment import Attachment
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.user import User
from app.services.translation_service import TranslationService
from app.ml.text_preprocessing import ComplaintTextPreprocessor


@pytest.fixture
def sqlite_db_session():
    """
    Creates an isolated in-memory SQLite database and session for testing.
    """
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Institution.__table__.create(test_engine)
    User.__table__.create(test_engine)
    Complaint.__table__.create(test_engine)
    Attachment.__table__.create(test_engine)

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    session = TestingSessionLocal()

    # Seed baseline institutions and users
    inst1 = Institution(
        id=1,
        aicte_id="AICTE-U-0001",
        name="Delhi Technical University",
        state="Delhi",
        city="New Delhi",
        institution_type="State University",
        bureau_jurisdiction="Approval Bureau",
    )
    inst2 = Institution(
        id=2,
        aicte_id="AICTE-U-0002",
        name="Mumbai Institute of Technology",
        state="Maharashtra",
        city="Mumbai",
        institution_type="Private",
        bureau_jurisdiction="Approval Bureau",
    )
    officer = User(
        id=101,
        email="officer@aicte.gov.in",
        hashed_password="hashed_pwd",
        full_name="Dr. S. Sharma",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    inst1_user = User(
        id=102,
        email="dtu@edu.in",
        hashed_password="hashed_pwd",
        full_name="DTU Admin",
        bureau="Delhi Technical University",
        role="institute",
        institution_id=1,
        is_active=True,
    )
    inst2_user = User(
        id=103,
        email="mit@edu.in",
        hashed_password="hashed_pwd",
        full_name="MIT Admin",
        bureau="Mumbai Institute of Technology",
        role="institute",
        institution_id=2,
        is_active=True,
    )

    session.add_all([inst1, inst2, officer, inst1_user, inst2_user])
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Complaint.__table__.drop(test_engine)
        Attachment.__table__.drop(test_engine)
        User.__table__.drop(test_engine)
        Institution.__table__.drop(test_engine)


@pytest.fixture
def client(sqlite_db_session):
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
def officer_headers():
    token = create_access_token(subject="officer@aicte.gov.in", role="officer", bureau="Approval Bureau")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def institute1_headers():
    token = create_access_token(subject="dtu@edu.in", role="institute", institution_id=1)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def institute2_headers():
    token = create_access_token(subject="mit@edu.in", role="institute", institution_id=2)
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Unit Tests: Language Detection & Translation Service
# ---------------------------------------------------------------------------

def test_detect_language_english():
    text = "The college is refusing to refund security deposit after course withdrawal."
    assert TranslationService.detect_language(text) == "en"


def test_detect_language_hindi():
    text = "कॉलेज 50000 रुपये अतिरिक्त फीस मांग रहा है और अंकतालिका रोक ली है।"
    assert TranslationService.detect_language(text) == "hi"


def test_detect_language_marathi():
    text = "कॉलेजने मूळ प्रमाणपत्रे रोखून ठेवली आहेत आणि फी परत देण्यास नकार दिला आहे."
    assert TranslationService.detect_language(text) == "mr"


def test_translation_service_preserves_english():
    subject = "Unapproved MCA course without AICTE affiliation"
    desc = "The institute enrolled 60 students in an unauthorized MCA batch without council approval."
    res = TranslationService.process_complaint_multilingual(subject, desc)

    assert res["detected_language"] == "en"
    assert res["translation_status"] == "original"
    assert res["translated_subject"] == subject
    assert res["translated_description"] == desc


def test_translation_service_translates_hindi():
    subject = "फीस वापसी से इनकार"
    desc = "संस्थान ने कॉशन मनी वापस नहीं की और अंकतालिका रोक ली है।"
    res = TranslationService.process_complaint_multilingual(subject, desc)

    assert res["detected_language"] == "hi"
    assert res["translation_status"] == "translated"
    assert any(w in res["translated_subject"].lower() for w in ["fee", "refund"])
    translated_desc_lower = res["translated_description"].lower()
    assert any(term in translated_desc_lower for term in ["caution deposit", "refund", "marksheets", "withheld", "detained"])


def test_translation_service_translates_marathi():
    subject = "कागदपत्रे परत देत नाहीत"
    desc = "कॉलेजने माझी मूळ प्रमाणपत्रे रोखून ठेवली आहेत आणि पावती दिली नाही."
    res = TranslationService.process_complaint_multilingual(subject, desc)

    assert res["detected_language"] == "mr"
    assert res["translation_status"] == "translated"
    translated_desc_lower = res["translated_description"].lower()
    assert any(term in translated_desc_lower for term in ["certificates", "withheld", "receipt", "college"])


# ---------------------------------------------------------------------------
# Integration Tests: Complaint Submission & Non-destructive Preservation
# ---------------------------------------------------------------------------

def test_create_complaint_hindi_preserves_original_and_translates(client, officer_headers):
    hindi_subject = "अतिरिक्त फीस वसूली और मानसिक प्रताड़ना"
    hindi_desc = "कॉलेज ने बिना रसीद दिए 75000 रुपये अतिरिक्त फीस ली और विरोध करने पर परीक्षा में बैठने से रोक दिया।"

    payload = {
        "institution_id": 1,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Fee Overcharging",
        "subject": hindi_subject,
        "description": hindi_desc,
        "priority": "High",
    }

    response = client.post("/api/v1/complaints", json=payload, headers=officer_headers)
    assert response.status_code == 201
    data = response.json()

    # Verify original text is STRICTLY preserved without corruption
    assert data["subject"] == hindi_subject
    assert data["description"] == hindi_desc

    # Verify multilingual intelligence metadata
    assert data["detected_language"] == "hi"
    assert data["translation_status"] == "translated"
    assert data["translated_subject"] is not None
    assert len(data["translated_subject"]) > 0
    assert data["translated_description"] is not None
    assert len(data["translated_description"]) > 0


def test_create_complaint_marathi_preserves_original_and_translates(client, officer_headers):
    marathi_subject = "शिक्षकांचा पगार दिला नाही"
    marathi_desc = "महाविद्यालयाने ६ महिने पगार दिला नाही आणि ७वा वेतन आयोग लागू केलेला नाही."

    payload = {
        "institution_id": 1,
        "complainant_type": "Faculty",
        "bureau": "Approval Bureau",
        "category": "Faculty Salaries",
        "subject": marathi_subject,
        "description": marathi_desc,
        "priority": "High",
    }

    response = client.post("/api/v1/complaints", json=payload, headers=officer_headers)
    assert response.status_code == 201
    data = response.json()

    # Verify original text is preserved
    assert data["subject"] == marathi_subject
    assert data["description"] == marathi_desc

    # Verify Marathi detection and translation
    assert data["detected_language"] == "mr"
    assert data["translation_status"] == "translated"
    assert any(term in data["translated_subject"].lower() for term in ["salary", "faculty", "unpaid"])
    assert "salary" in data["translated_description"].lower() or "unpaid" in data["translated_description"].lower()


# ---------------------------------------------------------------------------
# Cross-Language AI Feature Vector Compatibility
# ---------------------------------------------------------------------------

def test_cross_language_composite_text_normalization():
    """
    Verifies that ComplaintTextPreprocessor uses translated fields to extract
    clean English tokens from Indic complaints for TF-IDF duplicate detection.
    """
    preprocessor = ComplaintTextPreprocessor()

    marathi_complaint = {
        "subject": "मूळ प्रमाणपत्रे रोखून ठेवली",
        "category": "Withholding of Certificates",
        "description": "कॉलेजने माझी गुणपत्रिका आणि टीसी रोखून ठेवली आहे.",
        "translated_subject": "withheld original certificates",
        "translated_description": "college withheld my marksheets and transfer certificate",
    }

    composite = preprocessor.build_composite_text(marathi_complaint)
    assert "certificate" in composite or "certificates" in composite
    assert "withheld" in composite or "marksheets" in composite


# ---------------------------------------------------------------------------
# On-demand Translation Endpoint & Role Authorization
# ---------------------------------------------------------------------------

def test_on_demand_translate_endpoint(client, officer_headers):
    payload = {
        "institution_id": 1,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Anti-Ragging",
        "subject": "रॅगिंगची तक्रार वसतिगृहात",
        "description": "वरिष्ठ विद्यार्थ्यांकडून शारीरिक मारहाण आणि धमकी दिली गेली.",
        "priority": "Urgent",
    }
    create_res = client.post("/api/v1/complaints", json=payload, headers=officer_headers)
    assert create_res.status_code == 201
    c_id = create_res.json()["id"]

    # Call on-demand translate endpoint to English
    trans_res = client.post(f"/api/v1/complaints/{c_id}/translate", json={"target_language": "en"}, headers=officer_headers)
    assert trans_res.status_code == 200
    t_data = trans_res.json()

    assert t_data["complaint_id"] == c_id
    assert t_data["detected_language"] == "mr"
    assert t_data["original_subject"] == payload["subject"]
    assert t_data["translated_subject"] is not None
    assert t_data["translation_status"] == "translated"


def test_translate_english_to_hindi_and_marathi_on_demand(client, officer_headers):
    """Verifies that English complaints can be translated on-demand to Hindi and Marathi."""
    payload = {
        "institution_id": 1,
        "complainant_type": "Public",
        "bureau": "Approval Bureau",
        "category": "Excessive Fee Surcharges",
        "subject": "management",
        "description": "institute can get all fees but , not provide the expected outcomes .",
        "priority": "Medium",
    }
    create_res = client.post("/api/v1/complaints", json=payload, headers=officer_headers)
    assert create_res.status_code == 201
    c_id = create_res.json()["id"]

    # Translate to Hindi
    hi_res = client.post(f"/api/v1/complaints/{c_id}/translate", json={"target_language": "hi"}, headers=officer_headers)
    assert hi_res.status_code == 200
    hi_data = hi_res.json()
    assert hi_data["target_language"] == "hi"
    assert "प्रबंधन" in hi_data["translated_subject"]
    assert any(w in hi_data["translated_description"] for w in ["संस्थान", "फीस", "अपेक्षित", "सुविधाएं"])

    # Translate to Marathi
    mr_res = client.post(f"/api/v1/complaints/{c_id}/translate", json={"target_language": "mr"}, headers=officer_headers)
    assert mr_res.status_code == 200
    mr_data = mr_res.json()
    assert mr_data["target_language"] == "mr"
    assert "व्यवस्थापन" in mr_data["translated_subject"]
    assert any(w in mr_data["translated_description"] for w in ["संस्था", "फी", "अपेक्षित", "सुविधा"])


def test_institute_access_control_on_translate(client, officer_headers, institute2_headers):
    # Create complaint for Institution 1
    payload = {
        "institution_id": 1,
        "complainant_type": "Student",
        "bureau": "Approval Bureau",
        "category": "Fee Overcharging",
        "subject": "अवैध फीस",
        "description": "जादा फी आकारणी केली.",
    }
    c_res = client.post("/api/v1/complaints", json=payload, headers=officer_headers)
    assert c_res.status_code == 201
    c_id = c_res.json()["id"]

    # Institute 2 tries to translate Institute 1 complaint -> 403 Forbidden
    forbid_res = client.post(f"/api/v1/complaints/{c_id}/translate", json={"target_language": "en"}, headers=institute2_headers)
    assert forbid_res.status_code == 403
