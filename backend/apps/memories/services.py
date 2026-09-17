"""Question selection and idempotent attempt recording."""

import random
from typing import Any

from django.db import transaction
from django.db.models import Max
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.audit.services import audit
from apps.memories.models import Memory, MemoryMedia, MemoryQuizAttempt
from apps.patients.models import FamilyMember, PatientProfile


def _options(correct: str, alternatives: list[str]) -> list[str]:
    unique = [value for value in dict.fromkeys(alternatives) if value and value != correct]
    choices = [correct, *unique[:2]]
    while len(choices) < 3:
        choices.append(f"Another memory {len(choices)}")
    random.Random(correct).shuffle(choices)
    return choices


def next_question(patient: PatientProfile) -> dict[str, Any]:
    recent_ids = list(
        patient.quiz_attempts.exclude(memory=None).values_list("memory_id", flat=True)[:5]
    )
    consent = getattr(patient, "consent", None)
    if consent and consent.use_memories_in_quiz:
        memories = (
            Memory.objects.filter(patient=patient, visibility=Memory.Visibility.QUIZ)
            .exclude(id__in=recent_ids)
            .prefetch_related("people", "media")
            .annotate(last_asked=Max("memoryquizattempt__attempted_at"))
            .order_by("last_asked", "created_at")
        )
        for memory in memories:
            person = memory.people.first()
            if person:
                names = list(
                    patient.family_members.exclude(id=person.id).values_list("name", flat=True)
                )
                return {
                    "memory_id": str(memory.id),
                    "question_type": "who",
                    "prompt": "Who is this?",
                    "options": _options(person.name, names),
                    "expected_label": person.name,
                    "media_url": media_url(memory),
                }
            if memory.occurred_on:
                year = str(memory.occurred_on.year)
                return {
                    "memory_id": str(memory.id),
                    "question_type": "when",
                    "prompt": "When was this?",
                    "options": _options(
                        year,
                        [str(memory.occurred_on.year - 1), str(memory.occurred_on.year + 1)],
                    ),
                    "expected_label": year,
                    "media_url": media_url(memory),
                }
            if memory.place:
                places = [
                    *patient.known_places,
                    *Memory.objects.filter(patient=patient)
                    .exclude(id=memory.id)
                    .values_list("place", flat=True),
                ]
                return {
                    "memory_id": str(memory.id),
                    "question_type": "where",
                    "prompt": "Where was this?",
                    "options": _options(memory.place, places),
                    "expected_label": memory.place,
                    "media_url": media_url(memory),
                }
            if memory.occasion:
                occasions = [
                    label for value, label in Memory.Occasion.choices if value != memory.occasion
                ]
                return {
                    "memory_id": str(memory.id),
                    "question_type": "occasion",
                    "prompt": "What was the occasion?",
                    "options": _options(memory.get_occasion_display(), occasions),
                    "expected_label": memory.get_occasion_display(),
                    "media_url": media_url(memory),
                }
    members = list(patient.family_members.all())
    if not members:
        return {
            "memory_id": None,
            "question_type": "who",
            "prompt": "Who would you like to remember?",
            "options": [],
            "expected_label": "",
            "media_url": None,
        }
    correct = members[0]
    return {
        "memory_id": None,
        "question_type": "who",
        "prompt": "Who is this?",
        "options": _options(correct.name, [item.name for item in members[1:]]),
        "expected_label": correct.name,
        "media_url": media_url_for_family(correct),
    }


def media_url(memory: Memory) -> str | None:
    first = memory.media.filter(kind="photo").first()
    return first.file.url if first and first.file else None


def media_url_for_family(member: FamilyMember) -> str | None:
    return member.photo.url if member.photo else None


@transaction.atomic
def record_attempt(
    *, patient: PatientProfile, data: dict[str, Any]
) -> tuple[MemoryQuizAttempt, bool]:
    memory_id = data.pop("memory_id", None)
    if memory_id and not Memory.objects.filter(id=memory_id, patient=patient).exists():
        raise ValidationError({"memory_id": "Choose a memory for this patient."})
    idempotency_key = data.pop("idempotency_key")
    existing = MemoryQuizAttempt.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        if existing.patient_id != patient.id:
            raise ValidationError("That request key is already in use.")
        return existing, False
    attempt, created = MemoryQuizAttempt.objects.get_or_create(
        idempotency_key=idempotency_key,
        defaults={"patient": patient, "memory_id": memory_id, **data},
    )
    return attempt, created


@transaction.atomic
def create_memory(*, patient: PatientProfile, actor: User, data: dict[str, Any]) -> Memory:
    people_ids = data.pop("people", [])
    people = list(patient.family_members.filter(id__in=people_ids))
    if len(people) != len(set(people_ids)):
        raise ValidationError({"people": "One or more people are not in this patient's family."})
    memory = Memory.objects.create(patient=patient, uploaded_by=actor, **data)
    memory.people.set(people)
    audit(
        actor,
        "memory.created",
        memory,
        patient=patient,
        changes={
            "title": memory.title,
            "visibility": memory.visibility,
            "people": [str(item.id) for item in people],
        },
    )
    return memory


@transaction.atomic
def add_memory_media(*, memory: Memory, actor: User, data: dict[str, Any]) -> MemoryMedia:
    media = MemoryMedia.objects.create(memory=memory, kind=MemoryMedia.Kind.PHOTO, **data)
    audit(
        actor,
        "memory.media_added",
        media,
        patient=memory.patient,
        changes={"memory_id": str(memory.id)},
    )
    return media
