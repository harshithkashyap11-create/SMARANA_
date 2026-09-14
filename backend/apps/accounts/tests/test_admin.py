"""Tests for superuser creation and Django Admin."""

import pytest
from django.core.management import call_command
from django.test import Client

from apps.accounts.models import User


@pytest.mark.django_db
def test_createsuperuser_command_and_admin_loads() -> None:
    call_command(
        "createsuperuser",
        interactive=False,
        username="admin",
        role=User.Role.ADMIN,
    )
    admin_user = User.objects.get(username="admin")

    assert admin_user.is_staff
    assert admin_user.is_superuser

    client = Client()
    client.force_login(admin_user)
    response = client.get("/admin/")

    assert response.status_code == 200
