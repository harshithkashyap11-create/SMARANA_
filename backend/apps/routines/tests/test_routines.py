from datetime import date, time, timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.routines.models import Reminder, ReminderResponse, RoutineItem
from apps.routines.services import materialise_reminders
from apps.routines.tasks import mark_missed_reminders
from apps.shared.tests.factories import (
    CareAssignmentFactory,
    CaregiverFactory,
    DoctorAssignmentFactory,
    DoctorFactory,
    PatientFactory,
)


@pytest.fixture
def item(db: object) -> RoutineItem:
    patient = PatientFactory.create()
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
def test_edit_reschedules_future_pending_reminders_preserving_history(item: RoutineItem) -> None:
    tomorrow = timezone.localdate() + timedelta(days=1)
    first = materialise_reminders(item.patient, tomorrow, 2)
    first[0].status = Reminder.Status.TAKEN
    first[0].save()
    item.time_of_day = time(10, 30)
    item.save()
    materialise_reminders(item.patient, tomorrow, 2)
    first[0].refresh_from_db()
    first[1].refresh_from_db()
    assert timezone.localtime(first[0].scheduled_at).time() == time(8)
    assert timezone.localtime(first[1].scheduled_at).time() == time(10, 30)


@pytest.mark.django_db
@pytest.mark.parametrize("change", ["weekday", "start", "end", "delete"])
def test_recurrence_edit_removes_only_future_unanswered_instances(
    item: RoutineItem, change: str
) -> None:
    tomorrow = timezone.localdate() + timedelta(days=1)
    reminders = materialise_reminders(item.patient, tomorrow, 3)
    reminders[0].status = Reminder.Status.TAKEN
    reminders[0].save()
    ReminderResponse.objects.create(
        reminder=reminders[0],
        action="taken",
        responded_at=timezone.now(),
        idempotency_key=uuid4(),
    )
    if change == "weekday":
        item.days_of_week = [tomorrow.weekday()]
    elif change == "start":
        item.start_date = tomorrow + timedelta(days=3)
    elif change == "end":
        item.end_date = tomorrow
    if change == "delete":
        item.delete()
    else:
        item.save()
    materialise_reminders(item.patient, tomorrow, 3)
    assert Reminder.objects.filter(id=reminders[0].id, status="taken").exists()
    assert ReminderResponse.objects.filter(reminder=reminders[0]).count() == 1
    assert not Reminder.objects.filter(id__in=[row.id for row in reminders[1:]]).exists()


@pytest.mark.django_db
def test_patient_reminders_hide_deleted_routine(item: RoutineItem) -> None:
    reminder = materialise_reminders(item.patient, timezone.localdate(), 1)[0]
    item.delete()
    client = APIClient()
    client.force_authenticate(item.patient.user)
    response = client.get(f"/api/v1/patients/{item.patient.id}/reminders/")
    assert response.status_code == 200
    assert all(row["id"] != str(reminder.id) for row in response.data)


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
    caregiver = CaregiverFactory.create()
    CareAssignmentFactory.create(patient=item.patient, caregiver=caregiver)
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


@pytest.mark.django_db
def test_adherence_is_scoped_and_returns_medicine_statuses(item: RoutineItem) -> None:
    caregiver = CaregiverFactory.create()
    CareAssignmentFactory.create(patient=item.patient, caregiver=caregiver)
    reminder = materialise_reminders(item.patient, timezone.localdate(), 1)[0]
    reminder.status = Reminder.Status.TAKEN
    reminder.save()
    ReminderResponse.objects.create(
        reminder=reminder,
        action=ReminderResponse.Action.TAKEN,
        responded_at=timezone.now(),
        idempotency_key=uuid4(),
    )
    client = APIClient()
    client.force_authenticate(caregiver)
    response = client.get(f"/api/v1/patients/{item.patient.id}/adherence/?days=7")
    assert response.status_code == 200
    assert response.data["summary"]["taken"] == 1
    assert response.data["days"][-1]["reminders"][0]["responded_at"] is not None

    unassigned = CaregiverFactory.create()
    client.force_authenticate(unassigned)
    assert client.get(f"/api/v1/patients/{item.patient.id}/adherence/").status_code == 404


@pytest.mark.django_db
def test_caregiver_cannot_edit_doctor_item_and_history_is_audited(item: RoutineItem) -> None:
    caregiver = CaregiverFactory.create()
    doctor = DoctorFactory.create(display_name="Dr. Deka")
    CareAssignmentFactory.create(patient=item.patient, caregiver=caregiver)
    DoctorAssignmentFactory.create(patient=item.patient, doctor=doctor)
    item.source = RoutineItem.Source.DOCTOR
    item.created_by = doctor
    item.save()
    url = f"/api/v1/patients/{item.patient.id}/routine-items/{item.id}/"
    client = APIClient()
    client.force_authenticate(caregiver)
    response = client.patch(url, {"title": "Changed"}, format="json")
    assert response.status_code == 403
    assert response.data["code"] == "doctor_item_readonly"

    client.force_authenticate(doctor)
    assert client.patch(url, {"title": "Updated by doctor"}, format="json").status_code == 200
    history = client.get(f"{url}history/")
    assert history.status_code == 200
    assert history.data[0]["changes"]["before"]["title"] == "Morning tablet"
    assert history.data[0]["changes"]["after"]["title"] == "Updated by doctor"


@pytest.mark.django_db
def test_doctor_cannot_edit_caregiver_item(item: RoutineItem) -> None:
    doctor = DoctorFactory.create()
    DoctorAssignmentFactory.create(patient=item.patient, doctor=doctor)
    item.source = RoutineItem.Source.CAREGIVER
    item.save()
    client = APIClient()
    client.force_authenticate(doctor)
    response = client.patch(
        f"/api/v1/patients/{item.patient.id}/routine-items/{item.id}/",
        {"title": "Changed"},
        format="json",
    )
    assert response.status_code == 403
    assert response.data["code"] == "caregiver_item_readonly"


@pytest.mark.django_db
def test_caregiver_delete_soft_deletes_own_item(item: RoutineItem) -> None:
    caregiver = CaregiverFactory.create()
    CareAssignmentFactory.create(patient=item.patient, caregiver=caregiver)
    item.source = RoutineItem.Source.CAREGIVER
    item.created_by = caregiver
    item.save()
    client = APIClient()
    client.force_authenticate(caregiver)
    url = f"/api/v1/patients/{item.patient.id}/routine-items/{item.id}/"
    response = client.delete(url)
    assert response.status_code == 204
    assert not RoutineItem.objects.filter(id=item.id).exists()
    assert RoutineItem.all_objects.filter(id=item.id, deleted_at__isnull=False).exists()
    assert not item.patient.routine_items.filter(id=item.id).exists()
    listed = client.get(f"/api/v1/patients/{item.patient.id}/routine-items/")
    assert listed.status_code == 200
    assert all(row["id"] != str(item.id) for row in listed.data)
    assert (
        client.patch(url, {"title": "Cannot revive by editing"}, format="json").status_code == 404
    )
