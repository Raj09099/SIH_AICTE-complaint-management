"""
Integration tests for GET /api/v1/analytics/summary and GET /api/v1/analytics/bureau-breakdown.
Uses isolated in-memory SQLite database sessions and mocks.
Guarantees zero mutation to live production/Supabase databases.
"""

from datetime import date
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.dependencies import get_db
from app.main import app
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.user import User


@pytest.fixture
def sqlite_db_session():
    """
    Creates an isolated in-memory SQLite database and session for testing.
    Creates only the tables required for complaints/institution testing without PostgreSQL ARRAY types.
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


def test_analytics_summary_empty_database(client):
    """Verifies that an empty database returns a valid summary schema with zeros, not 500."""
    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    data = response.json()

    assert data["total_complaints"] == 0
    assert data["active_complaints"] == 0
    assert data["resolved_complaints"] == 0
    assert data["escalated_complaints"] == 0
    assert data["overdue_complaints"] == 0
    assert data["total_institutions"] == 0
    assert data["sla_compliance_rate"] == 0.0
    assert data["total_overlaps"] == 0
    assert data["total_patterns"] == 0
    assert data["evidence_total"] == 0
    assert data["monthly_trends"] == []
    assert data["bureau_distribution"] == []
    assert data["status_distribution"] == {}
    assert data["priority_distribution"] == {}


def test_analytics_bureau_breakdown_empty_database(client):
    """Verifies that bureau-breakdown returns an empty list for empty database."""
    response = client.get("/api/v1/analytics/bureau-breakdown")
    assert response.status_code == 200
    assert response.json() == []


def test_analytics_summary_populated_database(client, sqlite_db_session):
    """Verifies analytics calculations with populated mock data."""
    # Seed an institution
    inst = Institution(
        aicte_id="1-TEST-001",
        name="Apex Test Institute",
        state="Maharashtra",
        city="Pune",
        institution_type="Engineering",
        is_active=True,
    )
    sqlite_db_session.add(inst)
    sqlite_db_session.commit()
    sqlite_db_session.refresh(inst)

    # Seed complaints: 2 resolved, 1 active (new), 1 escalated
    c1 = Complaint(
        complaint_no="CMP-TEST-001",
        institution_id=inst.id,
        complainant_type="Student",
        bureau="Approval Bureau",
        category="Fee Surcharge",
        subject="Test Surcharge 1",
        description="Description 1",
        priority="High",
        status="Resolved",
        filing_date=date(2026, 5, 10),
        deadline_date=date(2026, 6, 10),
        is_escalated=False,
    )
    c2 = Complaint(
        complaint_no="CMP-TEST-002",
        institution_id=inst.id,
        complainant_type="Faculty",
        bureau="Approval Bureau",
        category="Infrastructure",
        subject="Test Infra 2",
        description="Description 2",
        priority="Medium",
        status="Resolved",
        filing_date=date(2026, 5, 15),
        deadline_date=date(2026, 6, 15),
        is_escalated=False,
    )
    c3 = Complaint(
        complaint_no="CMP-TEST-003",
        institution_id=inst.id,
        complainant_type="Student",
        bureau="Anti-Ragging Cell",
        category="Hostel",
        subject="Test Ragging 3",
        description="Description 3",
        priority="Urgent",
        status="New",
        filing_date=date(2026, 6, 1),
        deadline_date=date(2026, 12, 31),
        is_escalated=True,
    )
    sqlite_db_session.add_all([c1, c2, c3])
    sqlite_db_session.commit()

    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    data = response.json()

    assert data["total_complaints"] == 3
    assert data["active_complaints"] == 1
    assert data["resolved_complaints"] == 2
    assert data["escalated_complaints"] == 1
    assert data["overdue_complaints"] == 0
    assert data["total_institutions"] == 1
    assert data["sla_compliance_rate"] == 100.0

    # Status distribution
    assert data["status_distribution"] == {"Resolved": 2, "New": 1}
    assert data["priority_distribution"] == {"High": 1, "Medium": 1, "Urgent": 1}

    # Bureau distribution
    assert len(data["bureau_distribution"]) == 2
    approval_stat = next(b for b in data["bureau_distribution"] if b["name"] == "Approval Bureau")
    assert approval_stat["total"] == 2
    assert approval_stat["resolved"] == 2
    assert approval_stat["active"] == 0

    ragging_stat = next(b for b in data["bureau_distribution"] if b["name"] == "Anti-Ragging Cell")
    assert ragging_stat["total"] == 1
    assert ragging_stat["resolved"] == 0
    assert ragging_stat["active"] == 1

    # Monthly trends (May and June)
    assert len(data["monthly_trends"]) == 2
    may_trend = next(m for m in data["monthly_trends"] if m["month"] == "May")
    assert may_trend["received"] == 2
    assert may_trend["resolved"] == 2

    jun_trend = next(m for m in data["monthly_trends"] if m["month"] == "Jun")
    assert jun_trend["received"] == 1
    assert jun_trend["resolved"] == 0


def test_analytics_database_error_handling():
    """Verifies that database execution errors return HTTP 500 with proper error message."""
    mock_session = MagicMock()
    mock_session.query.side_effect = SQLAlchemyError("Database connection lost")

    def override_get_db_error():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db_error
    err_client = TestClient(app)

    try:
        response = err_client.get("/api/v1/analytics/summary")
        assert response.status_code == 500
        assert "database error" in response.json()["detail"].lower()

        breakdown_res = err_client.get("/api/v1/analytics/bureau-breakdown")
        assert breakdown_res.status_code == 500
        assert "database error" in breakdown_res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()
