"""Typed contract for the shared care-scenario fixture."""

from typing import TypedDict

from apps.accounts.models import User
from apps.patients.models import PatientProfile


class CareScenario(TypedDict):
    patient: PatientProfile
    other_patient: PatientProfile
    caregiver: User
    other_caregiver: User
    doctor: User
    other_doctor: User
    admin: User
