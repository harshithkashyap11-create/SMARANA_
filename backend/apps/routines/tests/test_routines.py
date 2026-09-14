from datetime import date, time, timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.routines.models import Reminder, ReminderResponse, RoutineItem
from apps.routines.services import materialise_reminders
from apps.routines.tasks import mark_missed_reminders
from apps.shared.tests.factories import CareAssignmentFactory, CaregiverFactory, PatientFactory


@pytest.fixture
def item(db: object) -> RoutineItem:
    patient = PatientFactory()
    return RoutineItem.objects.create(
        patient=patient,
        title="Morning tablet",
        category="medicine",
        time_of_day=time(8),
        days_of_week=list(range(7)),
        start_date=date(2026, 1, 1),
        source="system",
    )


@pytest.mark.django_db
def test_materialising_twice_is_idempotent(item: RoutineItem) -> None:
    first = materialise_reminders(item.patient, date(2026, 9, 14))
    second = materialise_reminders(item.patient, date(2026, 9, 14))
    assert [row.id for row in first] == [row.id for row in second]
    assert Reminder.objects.count() == 3


@pytest.mark.django_db
def test_respond_is_idempotent_and_scoped_to_patient(item: RoutineItem) -> None:
    reminder = materialise_reminders(item.patient, timezone.localdate(), 1)[0]
    client = APIClient()
    client.force_authenticate(item.patient.user)
    url = f"/api/v1/patients/{item.patient.id}/reminders/{reminder.id}/respond/"
    payload = {
        "action": "taken",
        "responded_at": timezone.now().isoformat(),
        "idempotency_key": str(uuid4()),
    }
    assert client.post(url, payload, format="json").status_code == 201
    assert client.post(url, payload, format="json").status_code == 201
    assert ReminderResponse.objects.count() == 1
    caregiver = CaregiverFactory()
    CareAssignmentFactory(patient=item.patient, caregiver=caregiver)
    client.force_authenticate(caregiver)
    assert client.post(url, payload, format="json").status_code == 403


@pytest.mark.django_db
def test_missed_marks_only_old_pending(item: RoutineItem) -> None:
    old = Reminder.objects.create(
        id=uuid4(),
        patient=item.patient,
        routine_item=item,
        scheduled_at=timezone.now() - timedelta(minutes=61),
    )
    recent = Reminder.objects.create(
        id=uuid4(), patient=item.patient, routine_item=item, scheduled_at=timezone.now()
    )
    taken = Reminder.objects.create(
        id=uuid4(),
        patient=item.patient,
        routine_item=item,
        scheduled_at=timezone.now() - timedelta(hours=2),
        status="taken",
    )
    assert mark_missed_reminders() >= 1
    old.refresh_from_db()
    recent.refresh_from_db()
    taken.refresh_from_db()
    assert (old.status, recent.status, taken.status) == ("missed", "pending", "taken")


@pytest.mark.django_db
def test_progress_contract_has_no_clinical_keys(item: RoutineItem) -> None:
    client = APIClient()
    client.force_authenticate(item.patient.user)
    response = client.get(f"/api/v1/patients/{item.patient.id}/progress-summary/")
    assert response.status_code == 200
    assert not {"accuracy", "level", "reaction"} & response.data.keys()
