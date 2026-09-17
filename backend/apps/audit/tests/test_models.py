import pytest
from django.test import Client

from apps.accounts.models import User
from apps.audit.services import audit
from apps.shared.tests.factories import CaregiverFactory


@pytest.mark.django_db
def test_audit_events_are_append_only() -> None:
    user = CaregiverFactory.create()
    event = audit(user, "login", user)

    event.action = "update"
    with pytest.raises(RuntimeError, match="append-only"):
        event.save()
    with pytest.raises(RuntimeError, match="cannot be deleted"):
        event.delete()


@pytest.mark.django_db
def test_admin_lists_audit_events() -> None:
    admin = CaregiverFactory.create(role=User.Role.ADMIN, is_staff=True, is_superuser=True)
    event = audit(admin, "login", admin)
    client = Client()
    client.force_login(admin)

    response = client.get("/admin/audit/auditevent/")

    assert response.status_code == 200
    assert str(event.id) in response.content.decode()
