import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["patient", "caregiver", "doctor"])
def test_registration(role):
    client = APIClient()
    payload = {
        "email": f"{role}@example.com",
        "display_name": "New account",
        "password": "SmaranaDemo123!",
        "role": role,
    }
    response = client.post("/api/v1/auth/register/", payload)
    assert response.status_code == 201
    user = User.objects.get(email=payload["email"])
    assert user.check_password(payload["password"])
    assert user.is_approved == (role == "patient")
    if role == "patient":
        assert user.patient_profile.consent is not None
    else:
        login = client.post(
            "/api/v1/auth/login/",
            {
                "email_or_phone": payload["email"],
                "password": payload["password"],
                "device_id": "registration-test",
            },
        )
        assert login.status_code == 403
    assert client.post("/api/v1/auth/register/", payload).status_code == 400
    assert (
        client.post(
            "/api/v1/auth/register/", {**payload, "email": "admin2@example.com", "role": "admin"}
        ).status_code
        == 400
    )
