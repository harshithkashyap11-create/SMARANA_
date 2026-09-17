"""Permission and assignment scoping tests for patient reads."""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.shared.tests.factories import (
    CareAssignmentFactory,
    DoctorAssignmentFactory,
    PatientFactory,
)
from apps.shared.tests.types import CareScenario

LIST_URL = "/api/v1/patients/"


def _ids(response: Response) -> set[str]:
    return {item["id"] for item in response.data["results"]}


@pytest.mark.django_db
def test_caregiver_sees_only_assigned_patient(api: APIClient, care_scenario: CareScenario) -> None:
    api.force_authenticate(user=care_scenario["caregiver"])

    response = api.get(LIST_URL)

    assert response.status_code == 200
    assert _ids(response) == {str(care_scenario["patient"].id)}


@pytest.mark.django_db
def test_doctor_sees_only_assigned_patient(api: APIClient, care_scenario: CareScenario) -> None:
    api.force_authenticate(user=care_scenario["doctor"])

    response = api.get(LIST_URL)

    assert response.status_code == 200
    assert _ids(response) == {str(care_scenario["patient"].id)}


@pytest.mark.django_db
def test_patient_sees_only_self(api: APIClient, care_scenario: CareScenario) -> None:
    api.force_authenticate(user=care_scenario["patient"].user)

    response = api.get(LIST_URL)

    assert response.status_code == 200
    assert _ids(response) == {str(care_scenario["patient"].id)}


@pytest.mark.django_db
def test_unassigned_patient_detail_is_404(api: APIClient, care_scenario: CareScenario) -> None:
    api.force_authenticate(user=care_scenario["caregiver"])

    response = api.get(f"{LIST_URL}{care_scenario['other_patient'].id}/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_patient_retrieves_self_but_not_another_patient(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(user=patient.user)

    own = api.get(f"{LIST_URL}{patient.id}/")
    other = api.get(f"{LIST_URL}{care_scenario['other_patient'].id}/")

    assert own.status_code == 200
    assert own.data["id"] == str(patient.id)
    assert other.status_code == 404


@pytest.mark.django_db
def test_inactive_assignments_are_excluded(api: APIClient, care_scenario: CareScenario) -> None:
    CareAssignmentFactory.create(
        patient=care_scenario["other_patient"],
        caregiver=care_scenario["caregiver"],
        active=False,
    )
    DoctorAssignmentFactory.create(
        patient=care_scenario["other_patient"],
        doctor=care_scenario["doctor"],
        active=False,
    )

    api.force_authenticate(user=care_scenario["caregiver"])
    caregiver_response = api.get(LIST_URL)
    api.force_authenticate(user=care_scenario["doctor"])
    doctor_response = api.get(LIST_URL)

    assert str(care_scenario["other_patient"].id) not in _ids(caregiver_response)
    assert str(care_scenario["other_patient"].id) not in _ids(doctor_response)


@pytest.mark.django_db
def test_admin_is_forbidden_from_patient_api(api: APIClient, care_scenario: CareScenario) -> None:
    api.force_authenticate(user=care_scenario["admin"])

    response = api.get(LIST_URL)

    assert response.status_code == 403


@pytest.mark.django_db
def test_patient_list_query_count_is_constant(api: APIClient, care_scenario: CareScenario) -> None:
    caregiver = care_scenario["caregiver"]
    api.force_authenticate(user=caregiver)
    with CaptureQueriesContext(connection) as baseline:
        first = api.get(LIST_URL)

    for _ in range(3):
        CareAssignmentFactory.create(patient=PatientFactory.create(), caregiver=caregiver)
    with CaptureQueriesContext(connection) as expanded:
        second = api.get(LIST_URL)

    assert first.status_code == 200
    assert second.status_code == 200
    assert len(expanded) == len(baseline)
