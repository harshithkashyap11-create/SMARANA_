"""Factories shared by backend tests."""

import factory
from factory.django import DjangoModelFactory

from apps.accounts.models import User


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda number: f"user{number}")
    display_name = factory.Sequence(lambda number: f"User {number}")
    role = User.Role.PATIENT
    password = factory.django.Password("test-password")
