"""OpenAPI schema endpoint tests."""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_schema_endpoint_is_public(api: APIClient) -> None:
    response = api.get(reverse("api-schema"), HTTP_ACCEPT="application/json")

    assert response.status_code == 200
    assert response.data["info"]["title"] == "Smārana API"
    assert "/api/v1/health/" in response.data["paths"]


@pytest.mark.django_db
def test_login_and_refresh_have_distinct_response_contracts(api: APIClient) -> None:
    response = api.get(reverse("api-schema"), HTTP_ACCEPT="application/json")

    schemas = response.data["components"]["schemas"]
    assert "user" in schemas["LoginResponse"]["required"]
    assert set(schemas["RotatedTokenResponse"]["required"]) == {"access", "refresh"}
