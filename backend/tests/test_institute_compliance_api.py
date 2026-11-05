"""
Unit, Integration, and Security Isolation Tests for:
Master Prompt: Update Automatic Reminder & Statutory Deadline Grid – Institute Dashboard
Covers:
1. Institution-Specific Compliance Management (Summary, Deadlines, History, Document Uploads)
2. Strict Data Isolation & Cross-Institution Tampering Prevention (ABC, XYZ, PQR test institutions)
3. Upcoming Reminders – Complaint Status Notifications (Scenarios A, B, C, D)
4. Read/Unread toggles and Mark All Read
5. Upload validation and 403 Forbidden enforcement on unauthorized cross-campus access
"""
from datetime import date, datetime, timedelta, timezone
import io
import os

os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.security import create_access_token
from app.dependencies import get_db
from app.main import app
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.institutional_compliance import (
    ComplianceDocument,
    InstitutionalCompliance,
)
from app.models.notification import Notification
from app.models.user import User
from app.services.reminder_service import ReminderService
from unittest.mock import patch


@pytest.fixture(autouse=True)
def mock_scheduler():
    """Mock APScheduler startup/shutdown during API unit testing."""
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
    InstitutionalCompliance.__table__.create(engine)
    ComplianceDocument.__table__.create(engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        ComplianceDocument.__table__.drop(engine)
        InstitutionalCompliance.__table__.drop(engine)
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
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def multi_institution_setup(sqlite_db_session):
    """
    Creates three distinct test institutions as required by Prompt Section 8:
    1. ABC Engineering College (id=101)
    2. XYZ Polytechnic (id=102)
    3. PQR Institute (id=103)
    plus users and statutory compliance requirements.
    """
    today = date.today()

    # 1. Institutions
    inst_abc = Institution(
        id=101,
        aicte_id="1-001-ABC",
        name="ABC Engineering College",
        state="Maharashtra",
        city="Pune",
        institution_type="Engineering",
        is_active=True,
    )
    inst_xyz = Institution(
        id=102,
        aicte_id="1-002-XYZ",
        name="XYZ Polytechnic",
        state="Karnataka",
        city="Bengaluru",
        institution_type="Polytechnic",
        is_active=True,
    )
    inst_pqr = Institution(
        id=103,
        aicte_id="1-003-PQR",
        name="PQR Institute",
        state="Delhi",
        city="New Delhi",
        institution_type="Management",
        is_active=True,
    )
    sqlite_db_session.add_all([inst_abc, inst_xyz, inst_pqr])
    sqlite_db_session.flush()

    # 2. Users
    user_abc = User(
        id=101,
        email="principal@abc-eng.edu.in",
        full_name="Principal Dr. A. B. Roy (ABC)",
        hashed_password="hashed_pw_abc",
        bureau="ABC Engineering College",
        role="institute",
        institution_id=101,
        is_active=True,
    )
    user_xyz = User(
        id=102,
        email="principal@xyz-poly.edu.in",
        full_name="Principal Mrs. X. Y. Zari (XYZ)",
        hashed_password="hashed_pw_xyz",
        bureau="XYZ Polytechnic",
        role="institute",
        institution_id=102,
        is_active=True,
    )
    user_pqr = User(
        id=103,
        email="director@pqr-inst.edu.in",
        full_name="Director Dr. P. Q. Rao (PQR)",
        hashed_password="hashed_pw_pqr",
        bureau="PQR Institute",
        role="institute",
        institution_id=103,
        is_active=True,
    )
    officer_user = User(
        id=999,
        email="officer@aicte-india.org",
        full_name="Shri AICTE Chief Officer",
        hashed_password="hashed_pw_officer",
        bureau="AICTE Central Command",
        role="officer",
        institution_id=None,
        is_active=True,
    )
    sqlite_db_session.add_all([user_abc, user_xyz, user_pqr, officer_user])
    sqlite_db_session.flush()

    # 3. Compliance requirements
    # ABC has: 1 completed, 1 upcoming, 1 overdue (total 3)
    comp_abc_1 = InstitutionalCompliance(
        id=1,
        institution_id=101,
        requirement_name="AICTE Approval Extension (EoA) 2026-27",
        category="Accreditation & Approval",
        description="Annual Extension of Approval affidavit submission.",
        due_date=today + timedelta(days=15),
        status="Completed",
        priority="Mandatory",
    )
    comp_abc_2 = InstitutionalCompliance(
        id=2,
        institution_id=101,
        requirement_name="Anti-Ragging Committee Constitution",
        category="Student Safety & Anti-Ragging",
        description="Mandatory constitution of campus Anti-Ragging squad.",
        due_date=today + timedelta(days=5),
        status="Pending",
        priority="Mandatory",
    )
    comp_abc_3 = InstitutionalCompliance(
        id=3,
        institution_id=101,
        requirement_name="Mandatory Public Disclosure 2026",
        category="Governance & Transparency",
        description="Publication of audited balance sheets and faculty rosters.",
        due_date=today - timedelta(days=10),
        status="Pending",
        priority="High",
    )

    # XYZ has: 2 upcoming, 0 completed, 0 overdue (total 2)
    comp_xyz_1 = InstitutionalCompliance(
        id=4,
        institution_id=102,
        requirement_name="Internal Complaints Committee (ICC) Filing",
        category="Statutory Compliance",
        description="Filing POSH compliance return with AICTE.",
        due_date=today + timedelta(days=20),
        status="Pending",
        priority="High",
    )
    comp_xyz_2 = InstitutionalCompliance(
        id=5,
        institution_id=102,
        requirement_name="SC/ST Grievance Cell Constitution",
        category="Equity & Inclusion",
        description="Establishment of campus SC/ST cell.",
        due_date=today + timedelta(days=25),
        status="Pending",
        priority="High",
    )

    # PQR has: 1 overdue (total 1)
    comp_pqr_1 = InstitutionalCompliance(
        id=6,
        institution_id=103,
        requirement_name="Fire & Building Safety Certificate",
        category="Infrastructure & Safety",
        description="Municipal Fire Department NOC renewal.",
        due_date=today - timedelta(days=5),
        status="Pending",
        priority="Urgent",
    )

    sqlite_db_session.add_all([comp_abc_1, comp_abc_2, comp_abc_3, comp_xyz_1, comp_xyz_2, comp_pqr_1])
    sqlite_db_session.commit()

    # Generate Auth tokens
    token_abc = create_access_token(
        subject=user_abc.email, role=user_abc.role, institution_id=101
    )
    token_xyz = create_access_token(
        subject=user_xyz.email, role=user_xyz.role, institution_id=102
    )
    token_pqr = create_access_token(
        subject=user_pqr.email, role=user_pqr.role, institution_id=103
    )
    token_officer = create_access_token(
        subject=officer_user.email, role=officer_user.role, institution_id=None
    )

    return {
        "user_abc": user_abc,
        "user_xyz": user_xyz,
        "user_pqr": user_pqr,
        "officer": officer_user,
        "token_abc": token_abc,
        "token_xyz": token_xyz,
        "token_pqr": token_pqr,
        "token_officer": token_officer,
    }


# =====================================================================
# FUNCTIONAL TESTS
# =====================================================================

def test_01_institution_specific_compliance_summary(client, multi_institution_setup):
    """Verifies that each institution receives exclusively its own 4 summary stats."""
    tokens = multi_institution_setup

    # 1. ABC Summary
    res_abc = client.get(
        "/api/v1/institute/compliance/summary",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res_abc.status_code == 200, res_abc.text
    data_abc = res_abc.json()
    assert data_abc["institution_id"] == 101
    assert data_abc["institution_name"] == "ABC Engineering College"
    assert data_abc["total_requirements"] == 3
    assert data_abc["completed_requirements"] == 1
    assert data_abc["upcoming_deadlines"] == 1
    assert data_abc["overdue_submissions"] == 1

    # 2. XYZ Summary
    res_xyz = client.get(
        "/api/v1/institute/compliance/summary",
        headers={"Authorization": f"Bearer {tokens['token_xyz']}"},
    )
    assert res_xyz.status_code == 200, res_xyz.text
    data_xyz = res_xyz.json()
    assert data_xyz["institution_id"] == 102
    assert data_xyz["institution_name"] == "XYZ Polytechnic"
    assert data_xyz["total_requirements"] == 2
    assert data_xyz["completed_requirements"] == 0
    assert data_xyz["upcoming_deadlines"] == 2
    assert data_xyz["overdue_submissions"] == 0

    # 3. PQR Summary
    res_pqr = client.get(
        "/api/v1/institute/compliance/summary",
        headers={"Authorization": f"Bearer {tokens['token_pqr']}"},
    )
    assert res_pqr.status_code == 200
    data_pqr = res_pqr.json()
    assert data_pqr["institution_id"] == 103
    assert data_pqr["total_requirements"] == 1
    assert data_pqr["overdue_submissions"] == 1


def test_02_institution_specific_deadlines_and_filters(client, multi_institution_setup):
    """Verifies statutory compliance deadlines and filter_type for authenticated institutions."""
    tokens = multi_institution_setup

    # ABC All Deadlines
    res = client.get(
        "/api/v1/institute/compliance/deadlines?filter_type=all",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 3
    for it in items:
        assert it["institution_id"] == 101

    # ABC Overdue filter
    res_overdue = client.get(
        "/api/v1/institute/compliance/deadlines?filter_type=overdue",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res_overdue.status_code == 200
    overdue_items = res_overdue.json()
    assert len(overdue_items) == 1
    assert overdue_items[0]["requirement_name"] == "Mandatory Public Disclosure 2026"
    assert overdue_items[0]["is_overdue"] is True

    # XYZ Upcoming filter
    res_upcoming = client.get(
        "/api/v1/institute/compliance/deadlines?filter_type=upcoming",
        headers={"Authorization": f"Bearer {tokens['token_xyz']}"},
    )
    assert res_upcoming.status_code == 200
    assert len(res_upcoming.json()) == 2


def test_03_compliance_document_upload_and_status_update(client, multi_institution_setup, tmp_path):
    """Verifies that an institution can upload a valid document against its requirement."""
    tokens = multi_institution_setup

    file_content = b"%PDF-1.4 Mock valid compliance proof affidavit document"
    files = {"file": ("eoa_resolution.pdf", io.BytesIO(file_content), "application/pdf")}
    data = {"remarks": "Academic Board signed copy"}

    # Upload against ABC's requirement #2 (Anti-Ragging)
    res = client.post(
        "/api/v1/institute/compliance/2/upload",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
        files=files,
        data=data,
    )
    assert res.status_code == 200, res.text
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["compliance_status"] == "Completed"
    assert res_data["document"]["file_name"] == "eoa_resolution.pdf"
    assert res_data["document"]["institution_id"] == 101

    # Verify history contains this uploaded document
    res_hist = client.get(
        "/api/v1/institute/compliance/history",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert len(hist) == 1
    assert hist[0]["file_name"] == "eoa_resolution.pdf"
    assert hist[0]["verification_status"] == "Verified"


def test_04_compliance_history_and_download(client, multi_institution_setup):
    """Verifies that an institution can view its history and download its document."""
    tokens = multi_institution_setup

    # First upload a document
    file_content = b"%PDF-1.4 Mock doc for download"
    files = {"file": ("abc_annual_report.pdf", io.BytesIO(file_content), "application/pdf")}
    upload_res = client.post(
        "/api/v1/institute/compliance/3/upload",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
        files=files,
        data={"remarks": "Audited report"},
    )
    assert upload_res.status_code == 200
    doc_id = upload_res.json()["document"]["id"]

    # Now download it
    dl_res = client.get(
        f"/api/v1/institute/compliance/documents/{doc_id}/download",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert dl_res.status_code == 200
    assert dl_res.content == file_content


# =====================================================================
# SECTION 4: UPCOMING REMINDERS – COMPLAINT STATUS NOTIFICATIONS
# =====================================================================

def test_05_complaint_status_notification_scenarios(sqlite_db_session, client, multi_institution_setup):
    """
    Verifies Section 4 Required notification scenarios:
    A. Complaint Resolved
    B. Complaint Transferred
    C. Complaint Under Review
    D. Complaint Requires Additional Information / Evidence
    """
    tokens = multi_institution_setup

    # Create test complaints for ABC (institution_id=101)
    cmp_a = Complaint(
        id=1011,
        complaint_no="AICTE-2026-A101",
        institution_id=101,
        complainant_type="Student",
        subject="Non-sanctioned hostel fee surcharge",
        description="Excessive charges collected from freshers.",
        bureau="Finance Cell",
        category="Fee Surcharge",
        status="New",
    )
    cmp_b = Complaint(
        id=1012,
        complaint_no="AICTE-2026-B102",
        institution_id=101,
        complainant_type="Faculty",
        subject="Faculty recruitment guideline dispute",
        description="Pending 7th CPC approval.",
        bureau="Approval Bureau",
        category="Staff Disparity",
        status="New",
    )
    sqlite_db_session.add_all([cmp_a, cmp_b])
    sqlite_db_session.commit()

    # Scenario C: Under Review
    ReminderService.create_complaint_status_notification(
        db=sqlite_db_session,
        complaint=cmp_a,
        new_status="Under Review",
        old_status="New",
    )

    # Scenario D: Evidence / Additional Information Requested
    ReminderService.create_complaint_status_notification(
        db=sqlite_db_session,
        complaint=cmp_a,
        new_status="Evidence Requested",
        old_status="Under Review",
    )

    # Scenario B: Complaint Transferred
    ReminderService.create_complaint_status_notification(
        db=sqlite_db_session,
        complaint=cmp_b,
        new_status="Transferred",
        old_status="New",
        new_bureau="Approval Bureau",
    )

    # Scenario A: Complaint Resolved
    ReminderService.create_complaint_status_notification(
        db=sqlite_db_session,
        complaint=cmp_b,
        new_status="Resolved",
        old_status="Transferred",
    )

    # Fetch reminders for ABC
    res = client.get(
        "/api/v1/institute/reminders",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res.status_code == 200, res.text
    reminders = res.json()
    assert len(reminders) == 4

    messages = [r["message"] for r in reminders]
    # Check Scenario A
    assert any("successfully resolved" in m for m in messages)
    # Check Scenario B
    assert any("transferred to Approval Bureau" in m for m in messages)
    # Check Scenario C
    assert any("currently under official review" in m for m in messages)
    # Check Scenario D
    assert any("additional compliance affidavits / evidence records" in m for m in messages)

    # All reminders must have tracking numbers and links
    for r in reminders:
        assert r["complaint_no"] in ("AICTE-2026-A101", "AICTE-2026-B102")
        assert r["link"].startswith("/complaints/")
        assert r["is_read"] is False


def test_06_mark_reminder_read_and_mark_all_read(sqlite_db_session, client, multi_institution_setup):
    """Verifies marking reminders as read individually and in bulk."""
    tokens = multi_institution_setup

    cmp = Complaint(
        id=1050,
        complaint_no="AICTE-2026-READTEST",
        institution_id=101,
        complainant_type="Student",
        subject="Test notification",
        description="Testing read state",
        bureau="Grievance Cell",
        category="General",
        status="New",
    )
    sqlite_db_session.add(cmp)
    sqlite_db_session.commit()

    n1 = Notification(
        user_id=101,
        institution_id=101,
        complaint_id=1050,
        notification_type="STATUS_UPDATE",
        title="Status Update 1",
        message="Notice 1",
        reminder_date=date.today(),
        is_read=False,
    )
    n2 = Notification(
        user_id=101,
        institution_id=101,
        complaint_id=1050,
        notification_type="COMPLAINT_RESOLVED",
        title="Status Update 2",
        message="Notice 2",
        reminder_date=date.today(),
        is_read=False,
    )
    sqlite_db_session.add_all([n1, n2])
    sqlite_db_session.commit()

    # 1. Mark single reminder read
    res_single = client.patch(
        f"/api/v1/institute/reminders/{n1.id}/read",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res_single.status_code == 200
    assert res_single.json()["is_read"] is True

    # 2. Check unread count is 1
    res_unread = client.get(
        "/api/v1/institute/reminders?unread_only=true",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res_unread.status_code == 200
    assert len(res_unread.json()) == 1
    assert res_unread.json()[0]["id"] == n2.id

    # 3. Mark all read
    res_all = client.post(
        "/api/v1/institute/reminders/mark-all-read",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res_all.status_code == 200
    assert res_all.json()["marked_read_count"] == 1

    # 4. Unread count should now be 0
    res_none = client.get(
        "/api/v1/institute/reminders?unread_only=true",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res_none.status_code == 200
    assert len(res_none.json()) == 0


# =====================================================================
# SECURITY & STRICT DATA ISOLATION TESTS (PROMPT SECTION 3 & 8)
# =====================================================================

def test_07_cross_institution_summary_and_deadlines_isolation(client, multi_institution_setup):
    """
    Security Invariant:
    - ABC cannot see XYZ's records.
    - XYZ cannot see PQR's records.
    - PQR cannot see ABC's records.
    """
    tokens = multi_institution_setup

    # ABC gets deadlines -> only 101 items
    res_abc = client.get("/api/v1/institute/compliance/deadlines", headers={"Authorization": f"Bearer {tokens['token_abc']}"})
    for item in res_abc.json():
        assert item["institution_id"] == 101

    # XYZ gets deadlines -> only 102 items
    res_xyz = client.get("/api/v1/institute/compliance/deadlines", headers={"Authorization": f"Bearer {tokens['token_xyz']}"})
    for item in res_xyz.json():
        assert item["institution_id"] == 102

    # PQR gets deadlines -> only 103 items
    res_pqr = client.get("/api/v1/institute/compliance/deadlines", headers={"Authorization": f"Bearer {tokens['token_pqr']}"})
    for item in res_pqr.json():
        assert item["institution_id"] == 103


def test_08_cross_institution_upload_tampering_forbidden(client, multi_institution_setup):
    """
    Security Test:
    - ABC attempts to upload document to XYZ's compliance requirement (id=4) -> 403 Forbidden!
    - XYZ attempts to upload document to PQR's compliance requirement (id=6) -> 403 Forbidden!
    """
    tokens = multi_institution_setup

    file_content = b"%PDF-1.4 Fake document"
    files = {"file": ("tampered.pdf", io.BytesIO(file_content), "application/pdf")}

    # ABC (101) tries to upload to requirement #4 (belongs to XYZ / 102)
    res_abc_on_xyz = client.post(
        "/api/v1/institute/compliance/4/upload",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
        files=files,
    )
    assert res_abc_on_xyz.status_code == 403
    assert "Access denied" in res_abc_on_xyz.json()["detail"]

    # XYZ (102) tries to upload to requirement #6 (belongs to PQR / 103)
    files2 = {"file": ("tampered2.pdf", io.BytesIO(file_content), "application/pdf")}
    res_xyz_on_pqr = client.post(
        "/api/v1/institute/compliance/6/upload",
        headers={"Authorization": f"Bearer {tokens['token_xyz']}"},
        files=files2,
    )
    assert res_xyz_on_pqr.status_code == 403
    assert "Access denied" in res_xyz_on_pqr.json()["detail"]


def test_09_cross_institution_document_download_forbidden(client, multi_institution_setup):
    """
    Security Test:
    - XYZ cannot download ABC's uploaded compliance documents -> 403 Forbidden!
    - PQR cannot download XYZ's compliance documents -> 403 Forbidden!
    """
    tokens = multi_institution_setup

    # 1. ABC uploads a genuine document
    file_content = b"%PDF-1.4 ABC Confidential Audit"
    files = {"file": ("abc_audit.pdf", io.BytesIO(file_content), "application/pdf")}
    up_res = client.post(
        "/api/v1/institute/compliance/1/upload",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
        files=files,
    )
    assert up_res.status_code == 200
    doc_id = up_res.json()["document"]["id"]

    # 2. XYZ attempts to download ABC's document -> 403
    dl_xyz = client.get(
        f"/api/v1/institute/compliance/documents/{doc_id}/download",
        headers={"Authorization": f"Bearer {tokens['token_xyz']}"},
    )
    assert dl_xyz.status_code == 403
    assert "Access denied" in dl_xyz.json()["detail"]

    # 3. PQR attempts to download ABC's document -> 403
    dl_pqr = client.get(
        f"/api/v1/institute/compliance/documents/{doc_id}/download",
        headers={"Authorization": f"Bearer {tokens['token_pqr']}"},
    )
    assert dl_pqr.status_code == 403
    assert "Access denied" in dl_pqr.json()["detail"]


def test_10_cross_institution_reminders_isolation(sqlite_db_session, client, multi_institution_setup):
    """
    Security Test:
    - Reminders are strictly partitioned by institution_id.
    - PQR cannot see ABC's reminders.
    - ABC cannot mark XYZ's reminder as read.
    """
    tokens = multi_institution_setup

    # Create reminder for XYZ (id=102)
    n_xyz = Notification(
        id=777,
        user_id=102,
        institution_id=102,
        notification_type="STATUS_UPDATE",
        title="XYZ Alert",
        message="Confidential alert for XYZ",
        reminder_date=date.today(),
        is_read=False,
    )
    sqlite_db_session.add(n_xyz)
    sqlite_db_session.commit()

    # PQR requests reminders -> n_xyz must NOT be returned
    res_pqr = client.get(
        "/api/v1/institute/reminders",
        headers={"Authorization": f"Bearer {tokens['token_pqr']}"},
    )
    assert res_pqr.status_code == 200
    pqr_ids = [r["id"] for r in res_pqr.json()]
    assert 777 not in pqr_ids

    # ABC attempts to mark XYZ's reminder as read -> 403 Forbidden!
    res_tamper = client.patch(
        "/api/v1/institute/reminders/777/read",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
    )
    assert res_tamper.status_code == 403
    assert "Cannot modify reminders belonging to another institution" in res_tamper.json()["detail"]


def test_11_unauthorized_and_invalid_file_rejection(client, multi_institution_setup):
    """Security Test: Unauthorized access and invalid file types (.exe, .sh)."""
    tokens = multi_institution_setup

    # 1. Unauthenticated request -> 401
    res_no_auth = client.get("/api/v1/institute/compliance/summary")
    assert res_no_auth.status_code == 401

    # 2. Invalid file extension upload
    bad_file = {"file": ("malicious.exe", io.BytesIO(b"binary"), "application/octet-stream")}
    res_bad_ext = client.post(
        "/api/v1/institute/compliance/1/upload",
        headers={"Authorization": f"Bearer {tokens['token_abc']}"},
        files=bad_file,
    )
    assert res_bad_ext.status_code == 400
    assert "Unsupported file type" in res_bad_ext.json()["detail"]

