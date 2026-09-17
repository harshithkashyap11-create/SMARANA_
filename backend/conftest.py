"""Backend-wide pytest fixtures."""

from collections.abc import Iterator

import pytest
from freezegun import freeze_time
from freezegun.api import FrozenDateTimeFactory
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
from apps.shared.tests.types import CareScenario


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def care_scenario(db: None) -> CareScenario:
    del db
    patient = PatientFactory.create()
    caregiver = CaregiverFactory.create()
    doctor = DoctorFactory.create()
    other_patient = PatientFactory.create()
    other_caregiver = CaregiverFactory.create()
    other_doctor = DoctorFactory.create()
    admin = UserFactory.create(role=User.Role.ADMIN, is_staff=True)

    CareAssignmentFactory.create(patient=patient, caregiver=caregiver, is_primary=True)
    DoctorAssignmentFactory.create(patient=patient, doctor=doctor)

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
def frozen_now() -> Iterator[FrozenDateTimeFactory]:
    with freeze_time("2026-09-12 09:00:00+05:30") as frozen:
        assert isinstance(frozen, FrozenDateTimeFactory)
        yield frozen
