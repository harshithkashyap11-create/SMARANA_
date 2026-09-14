"""Regression tests for shared backend fixtures."""

import pytest

from apps.patients.models import CareAssignment


@pytest.mark.django_db
def test_care_scenario_scopes_caregiver_to_assigned_patient(care_scenario) -> None:
    caregiver = care_scenario["caregiver"]
    patient = care_scenario["patient"]
    other_patient = care_scenario["other_patient"]

    assigned_patient_ids = set(
        CareAssignment.objects.filter(caregiver=caregiver, active=True).values_list(
            "patient_id", flat=True
        )
    )

    assert patient.id in assigned_patient_ids
    assert other_patient.id not in assigned_patient_ids
