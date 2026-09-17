"""Health endpoint tests."""

import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_endpoint_reports_database_ok(api: APIClient) -> None:
    response = api.get("/api/v1/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}


@pytest.mark.django_db
def test_health_ignores_stale_access_header(api: APIClient) -> None:
    response = api.get("/api/v1/health/", HTTP_AUTHORIZATION="Bearer stale-token")
    assert response.status_code == 200


def test_private_api_errors_are_not_cacheable(api: APIClient) -> None:
    response = api.get("/api/v1/auth/me/")
    assert response.status_code == 401
    assert response["Cache-Control"] == "private, no-store"
