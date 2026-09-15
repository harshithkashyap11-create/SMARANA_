from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.audit.models import AuditEvent
from apps.games.models import DifficultyChange, DifficultyState, GameDefinition, GameSession
from apps.shared.tests.factories import CareAssignmentFactory, CaregiverFactory, PatientFactory

pytestmark = pytest.mark.django_db


def client_for(user: object) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_caregiver_reads_scoped_sessions_and_difficulty_changes() -> None:
    patient = PatientFactory()
    other = PatientFactory()
    caregiver = CaregiverFactory()
    CareAssignmentFactory(patient=patient, caregiver=caregiver)
    game = GameDefinition.objects.create(key="memory", name="Memory", min_level=1, max_level=10)
    now = timezone.now()
    session = GameSession.objects.create(
        patient=patient,
        game=game,
        seed="seed",
        level=2,
        metrics={"accuracy": 0.8},
        started_at=now - timedelta(minutes=5),
        ended_at=now,
    )
    state = DifficultyState.objects.create(patient=patient, game=game, level=3)
    change = DifficultyChange.objects.create(
        state=state,
        session=session,
        from_level=2,
        to_level=3,
        reason_code="promote",
        explanation="A consistent pattern supported this change.",
    )
    client = client_for(caregiver)
    sessions = client.get(f"/api/v1/patients/{patient.id}/game-sessions/")
    assert [row["id"] for row in sessions.data] == [str(session.id)]
    changes = client.get(f"/api/v1/patients/{patient.id}/difficulty-changes/")
    assert [row["id"] for row in changes.data] == [str(change.id)]
    assert client.get(f"/api/v1/patients/{other.id}/game-sessions/").status_code == 404


def test_caregiver_note_requires_feedback_category_and_is_audited() -> None:
    patient = PatientFactory()
    caregiver = CaregiverFactory()
    CareAssignmentFactory(patient=patient, caregiver=caregiver)
    client = client_for(caregiver)
    url = f"/api/v1/patients/{patient.id}/notes/"
    rejected = client.post(
        url, {"text": "Rao enjoyed tea.", "category": "observation", "visibility": "care_team"}
    )
    assert rejected.status_code == 400
    created = client.post(
        url,
        {"text": "Rao enjoyed tea.", "category": "caregiver_feedback", "visibility": "doctor_only"},
    )
    assert created.status_code == 201
    assert created.data["visibility"] == "care_team"
    assert AuditEvent.objects.filter(
        action="clinical_note.created", target_id=created.data["id"]
    ).exists()
