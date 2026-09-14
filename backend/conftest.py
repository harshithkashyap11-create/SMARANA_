"""Backend-wide pytest fixtures."""

import pytest
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.shared.tests.factories import (
    CareAssignmentFactory,
    CaregiverFactory,
    DoctorAssignmentFactory,
    DoctorFactory,
    PatientFactory,
    UserFactory,
)


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def care_scenario(db: None) -> dict[str, object]:
    del db
    patient = PatientFactory()
    caregiver = CaregiverFactory()
    doctor = DoctorFactory()
    other_patient = PatientFactory()
    other_caregiver = CaregiverFactory()
    other_doctor = DoctorFactory()
    admin = UserFactory(role=User.Role.ADMIN, is_staff=True)

    CareAssignmentFactory(patient=patient, caregiver=caregiver, is_primary=True)
    DoctorAssignmentFactory(patient=patient, doctor=doctor)

    return {
        "patient": patient,
        "caregiver": caregiver,
        "doctor": doctor,
        "other_patient": other_patient,
        "other_caregiver": other_caregiver,
        "other_doctor": other_doctor,
        "admin": admin,
    }


@pytest.fixture
def frozen_now():
    with freeze_time("2026-09-12 09:00:00+05:30") as frozen:
        yield frozen
