"""
Integration tests for Authentication API (/api/v1/auth/login and /api/v1/auth/me).
Uses isolated in-memory SQLite database sessions.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, get_password_hash, verify_password
from app.dependencies import get_db
from app.main import app
from app.models.institution import Institution
from app.models.user import User


@pytest.fixture
def sqlite_auth_session():
    """Isolated in-memory SQLite session with users table."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    User.__table__.create(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        User.__table__.drop(engine)


@pytest.fixture
def client(sqlite_auth_session):
    def override_get_db():
        try:
            yield sqlite_auth_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_password_hash_and_verification():
    """Verifies that bcrypt hashing and verification behave deterministically and securely."""
    raw_pwd = "SecureOfficerPassword2026!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False
    assert verify_password("", hashed) is False


def test_login_success(client, sqlite_auth_session):
    """Verifies successful officer sign-in and token issuance."""
    hashed = get_password_hash("officerPass123")
    user = User(
        id=1,
        email="officer.approval@aicte.gov.in",
        hashed_password=hashed,
        full_name="Rajesh Sharma",
        bureau="Approval Bureau",
        role="officer",
        designation="Senior Case Reviewer",
        is_active=True,
    )
    sqlite_auth_session.add(user)
    sqlite_auth_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "officer.approval@aicte.gov.in", "password": "officerPass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "officer.approval@aicte.gov.in"
    assert data["user"]["role"] == "officer"
    assert data["user"]["bureau"] == "Approval Bureau"


def test_login_invalid_password(client, sqlite_auth_session):
    """Verifies that incorrect passwords return 401 Unauthorized without exposing details."""
    hashed = get_password_hash("correctPassword")
    user = User(
        id=2,
        email="examiner@aicte.gov.in",
        hashed_password=hashed,
        full_name="Dr. Sunita Patel",
        bureau="Academic Bureau",
        role="officer",
        is_active=True,
    )
    sqlite_auth_session.add(user)
    sqlite_auth_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "examiner@aicte.gov.in", "password": "WrongPasswordAttempt"},
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_login_nonexistent_user(client, sqlite_auth_session):
    """Verifies that unknown emails return 401 Unauthorized identically to avoid account enumeration."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@aicte.gov.in", "password": "anyPassword"},
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_login_deactivated_account_rejected(client, sqlite_auth_session):
    """Verifies that deactivated accounts are prevented from logging in with 403 Forbidden."""
    hashed = get_password_hash("validPass")
    user = User(
        id=3,
        email="inactive.officer@aicte.gov.in",
        hashed_password=hashed,
        full_name="Former Officer",
        bureau="Finance Cell",
        role="officer",
        is_active=False,
    )
    sqlite_auth_session.add(user)
    sqlite_auth_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "inactive.officer@aicte.gov.in", "password": "validPass"},
    )
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


def test_get_current_user_profile_me(client, sqlite_auth_session):
    """Verifies GET /api/v1/auth/me returns the profile for a valid JWT token."""
    hashed = get_password_hash("pass1234")
    user = User(
        id=4,
        email="admin.portal@aicte.gov.in",
        hashed_password=hashed,
        full_name="Council Admin",
        bureau="Administration Cell",
        role="admin",
        designation="Director IT",
        is_active=True,
    )
    sqlite_auth_session.add(user)
    sqlite_auth_session.commit()

    # Generate token
    token = create_access_token(user.email, role="admin", bureau="Administration Cell")

    # Call /auth/me with Bearer token
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "admin.portal@aicte.gov.in"
    assert data["role"] == "admin"
    assert data["full_name"] == "Council Admin"


def test_get_current_user_profile_unauthorized(client):
    """Verifies GET /api/v1/auth/me rejects requests with missing or invalid tokens."""
    # Missing token
    res_missing = client.get("/api/v1/auth/me")
    assert res_missing.status_code == 401

    # Invalid token string
    res_invalid = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_garbage_token_123"},
    )
    assert res_invalid.status_code == 401

