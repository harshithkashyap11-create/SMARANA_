import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.memories.models import Memory, MemoryQuizAttempt
from apps.shared.tests.factories import (
    CareAssignmentFactory,
    CaregiverFactory,
    ConsentSettingsFactory,
    DoctorAssignmentFactory,
    DoctorFactory,
    FamilyMemberFactory,
    PatientFactory,
)

pytestmark = pytest.mark.django_db


def client_for(user: object) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def memory_for(patient: object, uploader: object, visibility: str, title: str) -> Memory:
    return Memory.objects.create(
        patient=patient,
        uploaded_by=uploader,
        title=title,
        occasion="daily",
        summary="A happy day.",
        visibility=visibility,
    )


def test_memory_visibility_respects_role_and_doctor_consent() -> None:
    patient = PatientFactory()
    caregiver = CaregiverFactory()
    doctor = DoctorFactory()
    CareAssignmentFactory(patient=patient, caregiver=caregiver)
    DoctorAssignmentFactory(patient=patient, doctor=doctor)
    consent = ConsentSettingsFactory(patient=patient, share_memories_with_doctor=False)
    memory_for(patient, caregiver, "quiz", "Quiz memory")
    memory_for(patient, caregiver, "care_team", "Shared memory")

    url = f"/api/v1/patients/{patient.id}/memories/"
    assert len(client_for(patient.user).get(url).json()) == 2
    assert client_for(doctor).get(url).json() == []
    consent.share_memories_with_doctor = True
    consent.save()
    assert [item["title"] for item in client_for(doctor).get(url).json()] == ["Shared memory"]


def test_quiz_avoids_recent_memory_and_attempt_is_idempotent() -> None:
    patient = PatientFactory(known_places=["Guwahati", "Shillong", "Tezpur"])
    caregiver = CaregiverFactory()
    ConsentSettingsFactory(patient=patient, use_memories_in_quiz=True)
    first = memory_for(patient, caregiver, "quiz", "First")
    second = memory_for(patient, caregiver, "quiz", "Second")
    first.place = "Guwahati"
    first.save()
    second.place = "Shillong"
    second.save()
    MemoryQuizAttempt.objects.create(
        patient=patient,
        memory=first,
        question_type="where",
        expected="Guwahati",
        given="Guwahati",
        correct=True,
        attempted_at=timezone.now(),
        response_ms=1000,
        device_updated_at=timezone.now(),
        idempotency_key="old",
    )
    client = client_for(patient.user)
    question = client.get(f"/api/v1/patients/{patient.id}/memory-quiz/next/").json()
    assert question["memory_id"] == str(second.id)
    assert question["options"].count(question["expected_label"]) == 1

    payload = {
        "memory_id": str(second.id),
        "question_type": "where",
        "expected": "Shillong",
        "given": "Tezpur",
        "correct": False,
        "attempted_at": timezone.now().isoformat(),
        "response_ms": 800,
        "device_updated_at": timezone.now().isoformat(),
        "idempotency_key": "same-attempt",
    }
    url = f"/api/v1/patients/{patient.id}/memory-quiz/attempts/"
    assert client.post(url, payload, format="json").status_code == 201
    assert client.post(url, payload, format="json").status_code == 200
    assert MemoryQuizAttempt.objects.filter(idempotency_key="same-attempt").count() == 1


def test_consent_off_uses_family_only() -> None:
    patient = PatientFactory()
    caregiver = CaregiverFactory()
    ConsentSettingsFactory(patient=patient, use_memories_in_quiz=False)
    FamilyMemberFactory(patient=patient, name="Priya")
    memory_for(patient, caregiver, "quiz", "Hidden from quiz")
    result = client_for(patient.user).get(f"/api/v1/patients/{patient.id}/memory-quiz/next/").json()
    assert result["memory_id"] is None
    assert result["expected_label"] == "Priya"
