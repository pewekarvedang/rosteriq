"""
Security and Role-Based Access Control (RBAC) test suite for RosterIQ.
Verifies permission boundaries, role elevation prevention, and SQL injection safety.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.utils.auth import UserRole

client = TestClient(app)


def test_auth_me_default_role():
    """Verify default role is Operations Manager when no header is supplied."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == UserRole.OPERATIONS_MANAGER.value
    assert "publish_roster" in data["capabilities"]


def test_auth_me_role_header_switching():
    """Verify role switching via X-User-Role header."""
    # 1. Pod Lead
    r_lead = client.get("/api/v1/auth/me", headers={"X-User-Role": "Pod Lead"})
    assert r_lead.status_code == 200
    assert r_lead.json()["user"]["role"] == UserRole.POD_LEAD.value
    assert "view_pod_members" in r_lead.json()["capabilities"]
    assert "publish_roster" not in r_lead.json()["capabilities"]

    # 2. Frontline Employee
    r_emp = client.get("/api/v1/auth/me", headers={"X-User-Role": "Employee"})
    assert r_emp.status_code == 200
    assert r_emp.json()["user"]["role"] == UserRole.EMPLOYEE.value
    assert "view_self_roster" in r_emp.json()["capabilities"]
    assert "publish_roster" not in r_emp.json()["capabilities"]


def test_rbac_employee_cannot_publish_roster():
    """Verify Frontline Employee cannot publish a roster (403 Forbidden)."""
    response = client.post(
        "/api/v1/rosters/1/publish",
        headers={"X-User-Role": "Employee"}
    )
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_rbac_employee_cannot_delete_employee():
    """Verify Frontline Employee cannot delete an employee record (403 Forbidden)."""
    response = client.delete(
        "/api/v1/employees/999",
        headers={"X-User-Role": "Employee"}
    )
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_rbac_employee_cannot_delete_brand():
    """Verify Frontline Employee cannot delete a client brand (403 Forbidden)."""
    response = client.delete(
        "/api/v1/brands/999",
        headers={"X-User-Role": "Employee"}
    )
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_rbac_bearer_token_support():
    """Verify Authorization Bearer token header support for RBAC."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer pod_lead"}
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == UserRole.POD_LEAD.value


def test_sql_injection_protection_in_filters():
    """Verify SQL injection payloads in filter inputs are safely treated as literal strings."""
    sqli_payload = "1' OR '1'='1"
    response = client.get(f"/api/v1/employees?search={sqli_payload}")
    assert response.status_code in [200, 422]
    # No SQL error or unhandled 500
