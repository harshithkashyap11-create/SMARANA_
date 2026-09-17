from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.alerts.models import Alert
from apps.audit.models import AuditEvent
from apps.clinical.models import ClinicalNote
from apps.games.models import DifficultyState, GameDefinition, GameSession
from apps.routines.models import RoutineItem
from apps.shared.tests.factories import (
    CareAssignmentFactory,
    CaregiverFactory,
    DoctorAssignmentFactory,
    DoctorFactory,
    PatientFactory,
)

pytestmark = pytest.mark.django_db


def _client(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_metrics_exclude_guests_and_incomplete_means() -> None:
    doctor = DoctorFactory.create()
    patient = PatientFactory.create()
    DoctorAssignmentFactory.create(doctor=doctor, patient=patient)
    game = GameDefinition.objects.create(key="recall", name="Recall", cognitive_domains=["memory"])
    now = timezone.now()
    for index, (accuracy, completed, guest) in enumerate(
        [(0.5, True, False), (1.0, False, False), (0.9, True, True)]
    ):
        GameSession.objects.create(
            patient=patient,
            game=game,
            seed=str(index),
            level=1,
            guest_mode=guest,
            metrics={
                "accuracy": accuracy,
                "completed": completed,
                "mean_reaction_ms": 1000,
                "mistakes": 1,
                "hints_used": 0,
                "rounds": 1,
            },
            started_at=now - timedelta(minutes=2),
            ended_at=now,
        )
    response = _client(doctor).get(f"/api/v1/patients/{patient.id}/metrics/?window=7")
    assert response.status_code == 200
    assert response.data["domains"][0]["sessions"] == 2
    assert response.data["domains"][0]["mean_accuracy"] == 0.5
    assert response.data["domains"][0]["trend"] == "insufficient_data"


def test_medication_override_assignment_and_visibility() -> None:
    doctor = DoctorFactory.create(display_name="Dr Deka")
    caregiver = CaregiverFactory.create()
    patient = PatientFactory.create()
    DoctorAssignmentFactory.create(doctor=doctor, patient=patient)
    CareAssignmentFactory.create(caregiver=caregiver, patient=patient)
    game = GameDefinition.objects.create(key="sequence", name="Sequence", max_level=8)
    client = _client(doctor)

    medication = client.post(
        f"/api/v1/patients/{patient.id}/medications/",
        {
            "name": "Tablet",
            "dose": "1",
            "times": ["08:00", "20:00"],
            "instructions": "With water",
            "active": True,
            "start_date": timezone.localdate(),
        },
        format="json",
    )
    assert medication.status_code == 201
    assert RoutineItem.objects.filter(source_ref=medication.data["id"]).count() == 2
    assert Alert.objects.filter(patient=patient, rule_key="prescription_updated").exists()
    assert (
        _client(caregiver)
        .post(f"/api/v1/patients/{patient.id}/medications/", {}, format="json")
        .status_code
        == 403
    )

    override = client.post(
        f"/api/v1/patients/{patient.id}/difficulty/{game.key}/override/",
        {"action": "cap", "value": 3, "reason": "Keep sessions comfortable"},
        format="json",
    )
    assert override.status_code == 201
    state = DifficultyState.objects.get(patient=patient, game=game)
    assert state.cap_level == 3
    assert AuditEvent.objects.filter(action="override_dda", patient=patient).exists()

    assignment = client.post(
        f"/api/v1/patients/{patient.id}/assignments/",
        {
            "game": str(game.id),
            "start_level": 2,
            "target_minutes": 10,
            "times_per_week": 3,
            "time_slot": "morning",
            "review_date": timezone.localdate(),
            "active": True,
            "notes": "Short sessions",
        },
        format="json",
    )
    assert assignment.status_code == 201
    assert RoutineItem.objects.filter(source_ref=assignment.data["id"]).exists()
    assert client.get("/api/v1/doctor/dashboard/").data["reviews_due"]

    ClinicalNote.objects.create(
        patient=patient,
        author=doctor,
        category="general",
        visibility=ClinicalNote.Visibility.DOCTOR_ONLY,
        text="Private",
    )
    ClinicalNote.objects.create(
        patient=patient,
        author=doctor,
        category="general",
        visibility=ClinicalNote.Visibility.PATIENT_VISIBLE,
        text="Shared",
    )
    assert len(_client(patient.user).get(f"/api/v1/patients/{patient.id}/notes/").data) == 1
    assert len(_client(caregiver).get(f"/api/v1/patients/{patient.id}/notes/").data) == 1
