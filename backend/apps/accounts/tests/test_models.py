"""Tests for the custom user model."""

from uuid import UUID

import pytest

from apps.accounts.models import User
from apps.shared.tests.factories import UserFactory


@pytest.mark.django_db
def test_user_factory_creates_patient_user() -> None:
    user = UserFactory.create()

    assert isinstance(user.id, UUID)
    assert user.role == User.Role.PATIENT
    assert user.check_password("test-password")


@pytest.mark.django_db
def test_user_role_choices_are_complete() -> None:
    assert set(User.Role.values) == {"patient", "caregiver", "doctor", "admin"}
