import base64

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.audit.models import AuditEvent
from apps.memories.models import Memory, MemoryQuizAttempt
from apps.patients.models import PatientProfile
from apps.shared.tests.factories import (
    CareAssignmentFactory,
    CaregiverFactory,
    ConsentSettingsFactory,
    DoctorAssignmentFactory,
    DoctorFactory,
    FamilyMemberFactory,
    PatientFactory,
)
from apps.shared.tests.types import CareScenario

pytestmark = pytest.mark.django_db

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def client_for(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def memory_for(patient: PatientProfile, uploader: User, visibility: str, title: str) -> Memory:
    return Memory.objects.create(
        patient=patient,
        uploaded_by=uploader,
        title=title,
        occasion="daily",
        summary="A happy day.",
        visibility=visibility,
    )


def test_memory_visibility_respects_role_and_doctor_consent() -> None:
    patient = PatientFactory.create()
    caregiver = CaregiverFactory.create()
    doctor = DoctorFactory.create()
    CareAssignmentFactory.create(patient=patient, caregiver=caregiver)
    DoctorAssignmentFactory.create(patient=patient, doctor=doctor)
    consent = ConsentSettingsFactory.create(patient=patient, share_memories_with_doctor=False)
    memory_for(patient, caregiver, "quiz", "Quiz memory")
    memory_for(patient, caregiver, "care_team", "Shared memory")

    url = f"/api/v1/patients/{patient.id}/memories/"
    assert len(client_for(patient.user).get(url).json()) == 2
    assert client_for(doctor).get(url).json() == []
    consent.share_memories_with_doctor = True
    consent.save()
    assert [item["title"] for item in client_for(doctor).get(url).json()] == ["Shared memory"]


def test_quiz_avoids_recent_memory_and_attempt_is_idempotent() -> None:
    patient = PatientFactory.create(known_places=["Guwahati", "Shillong", "Tezpur"])
    caregiver = CaregiverFactory.create()
    ConsentSettingsFactory.create(patient=patient, use_memories_in_quiz=True)
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
    patient = PatientFactory.create()
    caregiver = CaregiverFactory.create()
    ConsentSettingsFactory.create(patient=patient, use_memories_in_quiz=False)
    FamilyMemberFactory.create(patient=patient, name="Priya")
    memory_for(patient, caregiver, "quiz", "Hidden from quiz")
    result = client_for(patient.user).get(f"/api/v1/patients/{patient.id}/memory-quiz/next/").json()
    assert result["memory_id"] is None
    assert result["expected_label"] == "Priya"


def test_caregiver_creates_quiz_memory_with_tagged_person_and_photo() -> None:
    patient = PatientFactory.create()
    caregiver = CaregiverFactory.create()
    CareAssignmentFactory.create(patient=patient, caregiver=caregiver)
    ConsentSettingsFactory.create(patient=patient, use_memories_in_quiz=True)
    person = FamilyMemberFactory.create(patient=patient, name="Priya")
    photo = SimpleUploadedFile("birthday.png", PNG_1X1, content_type="image/png")
    response = client_for(caregiver).post(
        f"/api/v1/patients/{patient.id}/memories/",
        {
            "title": "Birthday tea",
            "occasion": "birthday",
            "summary": "A warm family afternoon.",
            "visibility": "quiz",
            "people": [str(person.id)],
            "photos": [photo],
        },
        format="multipart",
    )
    assert response.status_code == 201
    memory = Memory.objects.get(id=response.data["id"])
    assert list(memory.people.values_list("id", flat=True)) == [person.id]
    assert memory.media.count() == 1
    question = client_for(patient.user).get(f"/api/v1/patients/{patient.id}/memory-quiz/next/")
    assert question.data["memory_id"] == str(memory.id)
    assert AuditEvent.objects.filter(action="memory.created", target_id=memory.id).exists()


def test_memory_upload_rejects_non_image_and_other_patient() -> None:
    patient = PatientFactory.create()
    other = PatientFactory.create()
    caregiver = CaregiverFactory.create()
    CareAssignmentFactory.create(patient=patient, caregiver=caregiver)
    payload = {
        "title": "Notes",
        "occasion": "daily",
        "summary": "A day.",
        "visibility": "private",
        "photos": [SimpleUploadedFile("notes.txt", b"no", content_type="text/plain")],
    }
    client = client_for(caregiver)
    assert (
        client.post(
            f"/api/v1/patients/{patient.id}/memories/", payload, format="multipart"
        ).status_code
        == 400
    )
    payload["photos"] = [SimpleUploadedFile("photo.png", PNG_1X1, content_type="image/png")]
    assert (
        client.post(
            f"/api/v1/patients/{other.id}/memories/", payload, format="multipart"
        ).status_code
        == 404
    )


def test_memory_detail_uses_uuid_route_and_disallows_post(
    api: APIClient, care_scenario: CareScenario
) -> None:
    from apps.memories.models import Memory

    patient = care_scenario["patient"]
    memory = Memory.objects.create(
        patient=patient,
        uploaded_by=care_scenario["caregiver"],
        title="A memory",
        occasion="daily",
        summary="Together",
        visibility="private",
    )
    api.force_authenticate(patient.user)
    url = f"/api/v1/patients/{patient.id}/memories/{memory.id}/"
    result = api.get(url)
    assert result.status_code == 200
    assert result.data["title"] == "A memory"
    assert api.post(url, {}, format="json").status_code == 405
