"""API tests for professional authentication and account context."""

from typing import cast
from unittest.mock import patch

import pytest
from django.contrib.auth.hashers import check_password
from rest_framework.test import APIClient

from apps.accounts.models import DeviceSession, User
from apps.audit.models import AuditEvent
from apps.patients.models import CareAssignment
from apps.shared.tests.factories import CareAssignmentFactory, CaregiverFactory, DoctorFactory

LOGIN_URL = "/api/v1/auth/login/"
REFRESH_URL = "/api/v1/auth/refresh/"
LOGOUT_URL = "/api/v1/auth/logout/"
ME_URL = "/api/v1/auth/me/"
PREFERENCES_URL = "/api/v1/auth/me/preferences/"
PASSWORD = "professional-password"


def _professional(*, role: str, approved: bool = True, email: str = "person@example.com") -> User:
    factory = DoctorFactory if role == User.Role.DOCTOR else CaregiverFactory
    return cast(
        User,
        factory(email=email, username=email, is_approved=approved, password=PASSWORD),
    )


@pytest.mark.django_db
def test_approved_caregiver_logs_in_and_device_session_is_reused(api: APIClient) -> None:
    user = _professional(role=User.Role.CAREGIVER, email="Priya@Example.com")
    payload = {
        "email_or_phone": "priya@example.com",
        "password": PASSWORD,
        "device_id": "priya-phone",
    }

    first = api.post(LOGIN_URL, payload, format="json")
    second = api.post(LOGIN_URL, payload, format="json")

    assert first.status_code == 200
    assert set(first.data) == {"access", "refresh", "user"}
    assert first.data["user"]["role"] == User.Role.CAREGIVER
    assert second.status_code == 200
    assert DeviceSession.objects.filter(user=user, device_id="priya-phone").count() == 1
    assert AuditEvent.objects.filter(actor=user, action="login").count() == 2


@pytest.mark.django_db
def test_unapproved_doctor_receives_awaiting_approval(api: APIClient) -> None:
    _professional(role=User.Role.DOCTOR, approved=False, email="deka@example.com")

    response = api.post(
        LOGIN_URL,
        {"email_or_phone": "deka@example.com", "password": PASSWORD, "device_id": "clinic"},
        format="json",
    )

    assert response.status_code == 403
    assert response.data == {"detail": "awaiting_approval", "code": "awaiting_approval"}


@pytest.mark.django_db
def test_wrong_password_and_unknown_email_have_identical_response(api: APIClient) -> None:
    _professional(role=User.Role.CAREGIVER)
    base = {"password": "wrong-password", "device_id": "browser"}

    with patch("apps.accounts.services.check_password", wraps=check_password) as verifier:
        wrong = api.post(
            LOGIN_URL, {**base, "email_or_phone": "person@example.com"}, format="json"
        )
        assert verifier.call_count == 1
        verifier.reset_mock()
        unknown = api.post(
            LOGIN_URL, {**base, "email_or_phone": "unknown@example.com"}, format="json"
        )
        assert verifier.call_count == 1

    assert wrong.status_code == 401
    assert unknown.status_code == 401
    assert wrong.data == unknown.data == {
        "detail": "credentials_not_verified",
        "code": "credentials_not_verified",
    }
    assert AuditEvent.objects.filter(action="login_failed").count() == 2


@pytest.mark.django_db
def test_refresh_rotates_and_rejects_old_refresh(api: APIClient) -> None:
    _professional(role=User.Role.CAREGIVER)
    login = api.post(
        LOGIN_URL,
        {"email_or_phone": "person@example.com", "password": PASSWORD, "device_id": "phone"},
        format="json",
    )
    old_refresh = login.data["refresh"]

    rotated = api.post(REFRESH_URL, {"refresh": old_refresh}, format="json")
    reused = api.post(REFRESH_URL, {"refresh": old_refresh}, format="json")

    assert rotated.status_code == 200
    assert rotated.data["refresh"] != old_refresh
    assert set(rotated.data) == {"access", "refresh"}
    assert reused.status_code == 401
    assert reused.data == {"detail": "token_not_valid", "code": "token_not_valid"}


@pytest.mark.django_db
def test_refresh_rejects_deactivated_user_without_advancing_session(api: APIClient) -> None:
    user = _professional(role=User.Role.CAREGIVER)
    login = api.post(
        LOGIN_URL,
        {"email_or_phone": "person@example.com", "password": PASSWORD, "device_id": "phone"},
        format="json",
    )
    session = DeviceSession.objects.get(user=user, device_id="phone")
    original_jti = session.refresh_token_jti
    user.is_active = False
    user.save(update_fields=["is_active"])

    response = api.post(REFRESH_URL, {"refresh": login.data["refresh"]}, format="json")

    assert response.status_code == 401
    assert response.data == {"detail": "token_not_valid", "code": "token_not_valid"}
    session.refresh_from_db()
    assert session.refresh_token_jti == original_jti


@pytest.mark.django_db
def test_me_returns_only_active_assigned_patients(api: APIClient, care_scenario) -> None:
    caregiver = care_scenario["caregiver"]
    patient = care_scenario["patient"]
    other_patient = care_scenario["other_patient"]
    CareAssignmentFactory(patient=other_patient, caregiver=caregiver, active=False)
    api.force_authenticate(user=caregiver)

    response = api.get(ME_URL)

    assert response.status_code == 200
    assert set(response.data) == {"user", "role", "preferences", "assignments"}
    assert response.data["role"] == User.Role.CAREGIVER
    assert response.data["assignments"]["patients"] == [
        {"id": str(patient.id), "name": patient.user.display_name}
    ]
    assert not CareAssignment.objects.filter(patient=other_patient, active=True).exists()


@pytest.mark.django_db
def test_preferences_patch_validates_and_persists(api: APIClient) -> None:
    user = _professional(role=User.Role.CAREGIVER)
    api.force_authenticate(user=user)

    response = api.patch(
        PREFERENCES_URL,
        {"theme": User.Theme.DARK, "font_scale": "1.4", "language": "bn"},
        format="json",
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.theme == User.Theme.DARK
    assert str(user.font_scale) == "1.4"
    assert user.language == "bn"
    event = AuditEvent.objects.get(actor=user, action="update")
    assert event.changes["before"]["theme"] == User.Theme.LIGHT
    assert event.changes["after"]["language"] == "bn"


@pytest.mark.django_db
def test_logout_blacklists_refresh(api: APIClient) -> None:
    user = _professional(role=User.Role.CAREGIVER)
    login = api.post(
        LOGIN_URL,
        {"email_or_phone": "person@example.com", "password": PASSWORD, "device_id": "phone"},
        format="json",
    )
    api.force_authenticate(user=user)

    logout = api.post(LOGOUT_URL, {"refresh": login.data["refresh"]}, format="json")
    reuse = api.post(REFRESH_URL, {"refresh": login.data["refresh"]}, format="json")

    assert logout.status_code == 204
    assert reuse.status_code == 401
    assert DeviceSession.objects.filter(user=user).count() == 0
