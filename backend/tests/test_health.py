from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """
    Verify GET /api/health returns 200 OK with expected status and keys.
    """
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app" in data
    assert "version" in data
    assert "timestamp" in data


def test_root_endpoint():
    """
    Verify root endpoint / returns 200 with welcome message and docs links.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "health" in data
    assert "docs" in data
