import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.alerts.models import Alert, SosEvent
from apps.shared.tests.factories import CareAssignmentFactory, CaregiverFactory, PatientFactory

pytestmark = pytest.mark.django_db


def client_for(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_sos_is_idempotent_and_acknowledgement_is_assignment_scoped() -> None:
    patient = PatientFactory.create()
    caregiver = CaregiverFactory.create()
    outsider = CaregiverFactory.create()
    CareAssignmentFactory.create(patient=patient, caregiver=caregiver)
    url = f"/api/v1/patients/{patient.id}/sos/"
    payload = {"idempotency_key": "sos-once"}
    first = client_for(patient.user).post(url, payload, format="json")
    second = client_for(patient.user).post(url, payload, format="json")
    assert first.status_code == 201
    assert second.status_code == 200
    assert SosEvent.objects.count() == 1
    alert = Alert.objects.get(rule_key="sos")
    assert alert.severity == "high"
    assert str(caregiver.id) in alert.evidence["recipient_ids"]

    acknowledge_url = f"/api/v1/sos/{first.json()['id']}/acknowledge/"
    assert client_for(outsider).post(acknowledge_url).status_code == 404
    assert client_for(caregiver).post(acknowledge_url).status_code == 200
