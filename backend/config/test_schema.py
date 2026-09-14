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
