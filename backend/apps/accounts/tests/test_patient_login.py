"""Patient PIN login and caregiver reset tests."""

from datetime import timedelta

import pytest
from django.contrib.auth.hashers import identify_hasher
from django.utils import timezone
from freezegun.api import FrozenDateTimeFactory
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import DeviceSession
from apps.accounts.services import set_pin
from apps.alerts.models import Alert
from apps.audit.models import AuditEvent
from apps.shared.tests.types import CareScenario

LOGIN_URL = "/api/v1/auth/patient/login/"
RESET_URL = "/api/v1/auth/patient/pin-reset/"
REFRESH_URL = "/api/v1/auth/refresh/"


def _login(api: APIClient, *, login_id: str, pin: str) -> Response:
    return api.post(
        LOGIN_URL,
        {"login_id": login_id, "pin": pin, "device_id": "patient-phone"},
        format="json",
    )


@pytest.mark.django_db
def test_correct_pin_logs_in_with_argon2_hash_and_device_bound_refresh(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    credential = patient.user.patient_credential
    set_pin(credential=credential, raw_pin="1234")

    response = _login(api, login_id=credential.login_id, pin="1234")

    assert response.status_code == 200
    assert response.data["user"]["role"] == "patient"
    assert identify_hasher(credential.pin_hash).algorithm == "argon2"
    assert DeviceSession.objects.filter(user=patient.user, device_id="patient-phone").exists()
    assert AuditEvent.objects.filter(actor=patient.user, action="login").exists()
    refresh = RefreshToken(response.data["refresh"])
    assert int(refresh["exp"]) - int(refresh["iat"]) == 30 * 24 * 60 * 60
    outstanding = OutstandingToken.objects.get(jti=refresh["jti"])
    assert int(outstanding.expires_at.timestamp()) == int(refresh["exp"])

    rotated_response = api.post(REFRESH_URL, {"refresh": response.data["refresh"]}, format="json")
    rotated = RefreshToken(rotated_response.data["refresh"])
    assert rotated_response.status_code == 200
    assert int(rotated["exp"]) - int(rotated["iat"]) == 30 * 24 * 60 * 60
    rotated_outstanding = OutstandingToken.objects.get(jti=rotated["jti"])
    assert int(rotated_outstanding.expires_at.timestamp()) == int(rotated["exp"])


@pytest.mark.django_db
def test_fifth_wrong_pin_locks_and_raises_one_open_alert(
    api: APIClient, care_scenario: CareScenario, frozen_now: FrozenDateTimeFactory
) -> None:
    credential = care_scenario["patient"].user.patient_credential

    for _ in range(4):
        response = _login(api, login_id=credential.login_id, pin="9999")
        assert response.status_code == 401
    fifth = _login(api, login_id=credential.login_id, pin="9999")
    sixth = _login(api, login_id=credential.login_id, pin="1234")

    assert fifth.status_code == 423
    assert fifth.data == {"detail": "locked", "code": "locked", "retry_after_seconds": 900}
    assert sixth.status_code == 423
    credential.refresh_from_db()
    assert credential.failed_attempts == 5
    assert (
        Alert.objects.filter(
            patient=care_scenario["patient"],
            rule_key=Alert.RuleKey.PIN_LOCKOUT,
            status=Alert.Status.OPEN,
        ).count()
        == 1
    )
    assert AuditEvent.objects.filter(action="login_failed").count() == 6


@pytest.mark.django_db
def test_correct_pin_after_lock_expires_resets_attempts(
    api: APIClient, care_scenario: CareScenario, frozen_now: FrozenDateTimeFactory
) -> None:
    credential = care_scenario["patient"].user.patient_credential
    credential.failed_attempts = 5
    credential.locked_until = timezone.now() + timedelta(minutes=15)
    credential.save(update_fields=["failed_attempts", "locked_until"])
    frozen_now.tick(delta=timedelta(minutes=16))

    response = _login(api, login_id=credential.login_id, pin="1234")

    assert response.status_code == 200
    credential.refresh_from_db()
    assert credential.failed_attempts == 0
    assert credential.locked_until is None


@pytest.mark.django_db
def test_only_primary_caregiver_can_reset_patient_pin(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    credential = patient.user.patient_credential
    payload = {"patient_id": str(patient.id), "new_pin": "4321"}

    api.force_authenticate(user=care_scenario["other_caregiver"])
    denied = api.post(RESET_URL, payload, format="json")
    api.force_authenticate(user=care_scenario["caregiver"])
    allowed = api.post(RESET_URL, payload, format="json")

    assert denied.status_code == 404
    assert denied.data == {"detail": "patient_not_found", "code": "patient_not_found"}
    assert allowed.status_code == 204
    credential.refresh_from_db()
    assert credential.check_pin("4321")
    assert credential.failed_attempts == 0
    assert credential.locked_until is None


@pytest.mark.django_db
def test_patient_and_doctor_cannot_reset_patient_pin(
    api: APIClient, care_scenario: CareScenario
) -> None:
    payload = {"patient_id": str(care_scenario["patient"].id), "new_pin": "4321"}

    api.force_authenticate(user=care_scenario["patient"].user)
    patient_response = api.post(RESET_URL, payload, format="json")
    api.force_authenticate(user=care_scenario["doctor"])
    doctor_response = api.post(RESET_URL, payload, format="json")

    assert patient_response.status_code == 403
    assert doctor_response.status_code == 403
