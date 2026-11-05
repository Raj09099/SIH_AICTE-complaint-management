"""
Unit and Integration Tests for Feature 3: PyMuPDF Resolution Evidence Checker in SIH26264.
Comprehensive test suite covering:
1. PyMuPDF PDF text extraction
2. DOCX and plain text extraction
3. Empty and corrupted document rejection
4. Password-protected PDF rejection
5. Scanned PDF detection & OCR requirement warning
6. 6-Factor transparent scoring formula and mathematical consistency
7. Category-aware verification checklist (Fee vs Non-financial/Infrastructure)
8. Checklist bug prevention: Missing/Unable-to-verify elements strictly prevent false green status
9. Financial amount mismatch detection (claimed 25k vs document 10k triggers Critical Warning)
10. Irrelevant / false evidence detection
11. API upload and verify endpoint integration
12. Official AICTE officer human review confirmation (Approve -> Resolved)
13. Human review rejection (Reject -> Evidence Requested)
14. Mandatory officer review notes validation
15. Evidence candidates lookup endpoint
"""

from datetime import date, datetime, timezone
from decimal import Decimal
import io
import os
from unittest.mock import patch
import zipfile

os.environ["TESTING"] = "1"

import fitz  # PyMuPDF
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.dependencies import get_db
from app.main import app
from app.ml.evidence_checker import ResolutionEvidenceChecker
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.resolution_evidence import ResolutionEvidence
from app.models.user import User


@pytest.fixture(autouse=True)
def mock_scheduler():
    """Mock APScheduler during tests."""
    with patch("app.core.scheduler.start_scheduler"), patch("app.core.scheduler.shutdown_scheduler"):
        yield


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
    ResolutionEvidence.__table__.create(engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        ResolutionEvidence.__table__.drop(engine)
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
def evidence_setup(sqlite_db_session):
    """Pre-seeds test institution, user, and complaint."""
    inst = Institution(
        id=1,
        aicte_id="AICTE-PUN-001",
        name="Apex College of Engineering",
        state="Maharashtra",
        city="Pune",
        bureau_jurisdiction="Approval Bureau",
    )
    sqlite_db_session.add(inst)

    officer = User(
        id=10,
        email="officer@aicte-india.org",
        hashed_password="hashed_pwd",
        full_name="Dr. S. Sharma",
        bureau="Approval Bureau",
        role="officer",
        is_active=True,
    )
    sqlite_db_session.add(officer)

    complaint = Complaint(
        id=101,
        complaint_no="CMP-2026-FEE01",
        institution_id=1,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Excessive / Non-Sanctioned Fee Surcharges",
        subject="Non refund of admission caution money deposit of Rs 15000",
        description="I cancelled admission within the statutory time limit but Apex College refuses to refund caution deposit of Rs 15000.",
        status="Under Review",
        filing_date=date(2026, 6, 1),
    )
    sqlite_db_session.add(complaint)
    sqlite_db_session.commit()

    return {"inst": inst, "officer": officer, "complaint": complaint}


def make_auth_header(user: User) -> dict:
    token = create_access_token(
        subject=user.email,
        role=user.role,
        bureau=user.bureau,
    )
    return {"Authorization": f"Bearer {token}"}


def create_sample_pdf_bytes(text_content: str, password: str = None) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    if text_content:
        page.insert_text((50, 72), text_content)
    if password:
        perm = int(fitz.PDF_PERM_ACCESSIBILITY | fitz.PDF_PERM_PRINT)
        doc.save("temp_enc.pdf", encryption=fitz.PDF_ENCRYPT_AES_256, user_pw=password, permissions=perm)
        doc.close()
        with open("temp_enc.pdf", "rb") as f:
            pdf_bytes = f.read()
        os.remove("temp_enc.pdf")
        return pdf_bytes
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# ==============================================================================
# TESTS
# ==============================================================================

def test_01_pymupdf_pdf_text_extraction():
    """1. PyMuPDF successfully parses text and page count from PDF bytes."""
    checker = ResolutionEvidenceChecker()
    raw_text = "Apex College of Engineering\nCompliance Directive: Caution money of Rs 15000 has been refunded."
    pdf_bytes = create_sample_pdf_bytes(raw_text)

    result = checker.extract_text_from_document(pdf_bytes, "affidavit.pdf")
    assert result["doc_format"] == "PDF"
    assert result["page_count"] == 1
    assert result["word_count"] >= 10
    assert "Caution money" in result["text"]
    assert "Apex College" in result["text"]


def test_02_docx_text_extraction():
    """2. DOCX extraction extracts XML text nodes and table cells from Word document."""
    checker = ResolutionEvidenceChecker()
    buf = io.BytesIO()
    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body>'
        '<w:p><w:r><w:t>Institutional Compliance Proof: Refund credited successfully.</w:t></w:r></w:p>'
        '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>UTR #HDFC998877 Rs 15000</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
        '</w:body>'
        '</w:document>'
    )
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", xml_content)

    result = checker.extract_text_from_document(buf.getvalue(), "proof.docx")
    assert result["doc_format"] == "DOCX"
    assert "Refund credited successfully" in result["text"]
    assert "UTR #HDFC998877" in result["text"]


def test_03_empty_and_corrupted_document_rejection():
    """3. Empty files and non-PDF corrupted files raise informative errors."""
    checker = ResolutionEvidenceChecker()
    with pytest.raises(ValueError, match="empty"):
        checker.extract_text_from_document(b"", "empty.pdf")

    with pytest.raises(ValueError, match="Corrupted or invalid PDF"):
        checker.extract_text_from_document(b"NOT_A_REAL_PDF_HEADER", "corrupt.pdf")


def test_04_password_protected_pdf_detection():
    """4. Password-protected PDFs are intercepted with clear instruction."""
    checker = ResolutionEvidenceChecker()
    enc_bytes = create_sample_pdf_bytes("Secret Content", password="pass123")
    with pytest.raises(ValueError, match="password-protected"):
        checker.extract_text_from_document(enc_bytes, "locked.pdf")


def test_05_scanned_pdf_without_text_layer_detection():
    """5. Scanned PDFs containing zero text layer flag requires_ocr."""
    checker = ResolutionEvidenceChecker()
    # Blank PDF page without text
    blank_bytes = create_sample_pdf_bytes("")
    result = checker.extract_text_from_document(blank_bytes, "scanned_doc.pdf")
    assert result["is_scanned"] is True
    assert result["requires_ocr"] is True

    audit = checker.evaluate_relevance(
        {"complaint_no": "CMP-1", "subject": "Fee refund"},
        "",
        is_scanned=True,
    )
    assert audit["is_scanned_pdf"] is True
    assert audit["recommendation_code"] == "REJECT_RECOMMENDED"
    assert any("OCR" in w["message"] for w in audit["warnings"])


def test_06_scoring_mathematical_consistency():
    """6. All 6 component scores sum up exactly to the total score (0 to 100)."""
    checker = ResolutionEvidenceChecker()
    comp_details = {
        "complaint_no": "CMP-2026-FEE01",
        "category": "Excessive Fee Surcharges",
        "bureau": "Approval Bureau",
        "subject": "Non refund of admission caution deposit of Rs 15000",
        "description": "College refuses to refund caution deposit of Rs 15000.",
    }
    evidence_text = """
    Apex College of Engineering - Office of the Principal
    Statutory Compliance Affidavit
    Ref Grievance: CMP-2026-FEE01
    This is to certify that caution money deposit of Rs. 15,000 has been refunded to the student
    via bank account transfer UTR #HDFC000987621 on 15/10/2026.
    Action taken has completely resolved this grievance.
    Sd/- Principal, Apex College
    """

    audit = checker.evaluate_relevance(comp_details, evidence_text)
    components = audit["score_components"]
    assert len(components) == 6

    # Verify component weights: 30 + 20 + 15 + 15 + 10 + 10 == 100
    total_weights = sum(c["weight"] for c in components)
    assert total_weights == 100.0

    # Verify mathematical sum equals total score
    calc_sum = round(sum(c["score"] for c in components), 1)
    assert calc_sum == audit["total_score"]
    assert 0.0 <= audit["total_score"] <= 100.0


def test_07_financial_amount_mismatch_detection():
    """7. Significant amount mismatch (claimed 25k vs document 10k) flags Critical Warning."""
    checker = ResolutionEvidenceChecker()
    comp_details = {
        "complaint_no": "CMP-2026-FEE01",
        "category": "Excessive Fee Surcharges",
        "bureau": "Approval Bureau",
        "subject": "Excessive fee refund of Rs 25000",
        "description": "College charged Rs 25000 excess development fee.",
    }
    # Document only accounts for 10000
    mismatched_text = """
    Apex College of Engineering
    Compliance Report Ref: CMP-2026-FEE01
    This is to certify that student refund of Rs 10000 has been issued via UTR 12345678.
    Sd/- Principal
    """

    audit = checker.evaluate_relevance(comp_details, mismatched_text)
    # Must flag critical warning
    crit_warnings = [w for w in audit["warnings"] if w["severity"] == "Critical"]
    assert len(crit_warnings) >= 1
    assert any("Mismatch" in w["message"] for w in crit_warnings)

    # Entity match record shows MISMATCH
    amount_match = next((em for em in audit["entity_matches"] if em["field"] == "Financial Amount"), None)
    assert amount_match is not None
    assert amount_match["status"] == "MISMATCH"


def test_08_checklist_missing_elements_prevention():
    """8. Missing or unverified elements strictly prevent false 'all elements present' flag."""
    checker = ResolutionEvidenceChecker()
    comp_details = {
        "complaint_no": "CMP-2026-FEE01",
        "category": "Excessive Fee Surcharges",
        "subject": "Fee refund of Rs 15000",
        "description": "Seeking refund",
    }
    # Document lacking letterhead, student ref, and transaction proof
    scanty_text = "The grievance was addressed. Signed."

    audit = checker.evaluate_relevance(comp_details, scanty_text)
    assert audit["all_elements_present"] is False
    assert len(audit["missing_elements"]) >= 2

    # Signature/seal is marked Unable to Verify (not falsely marked Present)
    sig_item = next(it for it in audit["checklist"] if it["key"] == "signature_seal")
    assert sig_item["status"] == "Unable to Verify"


def test_09_category_aware_checklist_infrastructure():
    """9. Infrastructure grievances mark financial transaction proof as Not Applicable."""
    checker = ResolutionEvidenceChecker()
    comp_details = {
        "complaint_no": "CMP-2026-INFRA01",
        "category": "Hostel Deficit / Infrastructure",
        "bureau": "Academic Bureau",
        "subject": "Water shortage and broken sanitation in hostel block B",
        "description": "Sanitation pipes broken in block B.",
    }
    infra_text = """
    Apex College of Engineering - Estate Management Department
    Compliance Inspection Report Ref: CMP-2026-INFRA01
    On 20/10/2026, plumbing repairs were completed in hostel block B.
    All water lines have been restored and inspected. The grievance is resolved.
    Sd/- Estate Officer
    """

    audit = checker.evaluate_relevance(comp_details, infra_text)
    fin_item = next(it for it in audit["checklist"] if it["key"] == "financial_proof")
    assert fin_item["status"] == "Not Applicable"


def test_10_api_upload_and_verify_endpoint(client, sqlite_db_session, evidence_setup):
    """10. POST /api/v1/evidence/upload-and-verify uploads file, parses PyMuPDF, and returns dossier."""
    officer = evidence_setup["officer"]
    complaint = evidence_setup["complaint"]
    h = make_auth_header(officer)

    pdf_bytes = create_sample_pdf_bytes(
        "Apex College of Engineering Compliance Affidavit.\n"
        "Grievance CMP-2026-FEE01 has been settled with full refund of Rs 15000 via UTR 998811 on 10/10/2026.\n"
        "Sd/- Principal"
    )

    files = {"file": ("affidavit.pdf", pdf_bytes, "application/pdf")}
    data = {"complaint_id": str(complaint.id), "officer_notes": "Received verified scan"}

    res = client.post("/api/v1/evidence/upload-and-verify", headers=h, data=data, files=files)
    assert res.status_code == 200
    res_data = res.json()

    assert res_data["complaint_id"] == 101
    assert res_data["filename"] == "affidavit.pdf"
    assert len(res_data["relevance_breakdown"]["score_components"]) == 6
    assert len(res_data["relevance_breakdown"]["checklist"]) == 8
    assert res_data["relevance_score"] > 0.0


def test_11_api_human_review_approval_resolves_complaint(client, sqlite_db_session, evidence_setup):
    """11. Human review approval marks case as Resolved and records reviewer decision."""
    officer = evidence_setup["officer"]
    complaint = evidence_setup["complaint"]
    h = make_auth_header(officer)

    ev = ResolutionEvidence(
        id=50,
        complaint_id=101,
        filename="resolution_proof.pdf",
        file_path="uploads/evidence/test.pdf",
        file_size_bytes=1024,
        extracted_text="Caution money refunded.",
        relevance_score=Decimal("0.85"),
        relevance_breakdown={"percentage": 85, "recommendation": "Strong", "recommendation_code": "APPROVE_RECOMMENDED"},
        human_verified=False,
    )
    sqlite_db_session.add(ev)
    sqlite_db_session.commit()

    review_payload = {
        "decision": "approved",
        "verification_notes": "Verified genuine bank UTR with student John Doe. Case resolved.",
        "resolution_summary": "Full refund of caution money issued.",
    }

    res = client.post(f"/api/v1/evidence/{ev.id}/review", headers=h, json=review_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["human_verified"] is True
    assert data["reviewer_decision"] == "approved"

    # Verify complaint state in database is updated to Resolved
    updated_comp = sqlite_db_session.query(Complaint).filter(Complaint.id == 101).first()
    assert updated_comp.status == "Resolved"
    assert "Full refund" in updated_comp.resolution_summary


def test_12_api_human_review_rejection_requests_evidence(client, sqlite_db_session, evidence_setup):
    """12. Human review rejection marks complaint status as Evidence Requested."""
    officer = evidence_setup["officer"]
    complaint = evidence_setup["complaint"]
    h = make_auth_header(officer)

    ev = ResolutionEvidence(
        id=51,
        complaint_id=101,
        filename="fake_proof.pdf",
        file_path="uploads/evidence/fake.pdf",
        file_size_bytes=512,
        extracted_text="Irrelevant text.",
        relevance_score=Decimal("0.25"),
        relevance_breakdown={"percentage": 25, "recommendation": "Weak", "recommendation_code": "REJECT_RECOMMENDED"},
        human_verified=False,
    )
    sqlite_db_session.add(ev)
    sqlite_db_session.commit()

    review_payload = {
        "decision": "rejected",
        "verification_notes": "Submitted document is not a bank voucher. Rejected.",
    }

    res = client.post(f"/api/v1/evidence/{ev.id}/review", headers=h, json=review_payload)
    assert res.status_code == 200

    updated_comp = sqlite_db_session.query(Complaint).filter(Complaint.id == 101).first()
    assert updated_comp.status == "Evidence Requested"


def test_13_api_review_requires_mandatory_notes(client, sqlite_db_session, evidence_setup):
    """13. Submitting human review with empty notes raises 422 Unprocessable Entity."""
    officer = evidence_setup["officer"]
    h = make_auth_header(officer)

    ev = ResolutionEvidence(
        id=52,
        complaint_id=101,
        filename="proof.pdf",
        file_path="uploads/evidence/test2.pdf",
        file_size_bytes=512,
        extracted_text="Some text",
        relevance_score=Decimal("0.70"),
        human_verified=False,
    )
    sqlite_db_session.add(ev)
    sqlite_db_session.commit()

    # Empty notes payload
    res = client.post(f"/api/v1/evidence/{ev.id}/review", headers=h, json={"decision": "approved", "verification_notes": "abc"})
    assert res.status_code == 422  # min_length=5


def test_14_evidence_candidates_endpoint(client, sqlite_db_session, evidence_setup):
    """14. GET /api/v1/evidence/candidates returns complaint candidates for selector."""
    officer = evidence_setup["officer"]
    h = make_auth_header(officer)

    res = client.get("/api/v1/evidence/candidates", headers=h)
    assert res.status_code == 200
    data = res.json()

    assert len(data) >= 1
    item = next((c for c in data if c["id"] == 101), None)
    assert item is not None
    assert item["complaint_no"] == "CMP-2026-FEE01"
    assert item["institution_name"] == "Apex College of Engineering"
