"""Tests for the local demo-data management command."""

from io import StringIO

import pytest
from django.contrib.auth.hashers import check_password
from django.core.management import call_command

from apps.accounts.models import PatientCredential, User
from apps.patients.models import CareAssignment, DoctorAssignment, PatientProfile


@pytest.mark.django_db
def test_seed_demo_is_idempotent_and_hashes_credentials() -> None:
    output = StringIO()

    call_command("seed_demo", stdout=output)
    call_command("seed_demo", stdout=output)

    assert User.objects.count() == 4
    assert PatientProfile.objects.count() == 1
    assert PatientCredential.objects.count() == 1
    assert CareAssignment.objects.count() == 1
    assert DoctorAssignment.objects.count() == 1

    patient = User.objects.get(username="RAO1234")
    credential = PatientCredential.objects.get(user=patient)
    caregiver = User.objects.get(username="priya@example.com")
    doctor = User.objects.get(username="deka@example.com")
    admin = User.objects.get(username="admin")

    assert credential.pin_hash != "1234"
    assert check_password("1234", credential.pin_hash)
    assert caregiver.check_password("SmaranaDemo123!")
    assert doctor.check_password("SmaranaDemo123!")
    assert admin.check_password("SmaranaDemo123!")
    assert admin.is_staff and admin.is_superuser
    assert "RAO1234 / PIN 1234" in output.getvalue()
