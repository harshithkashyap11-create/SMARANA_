"""Submission regressions at real parser, database and role boundaries."""

from typing import Any
from uuid import uuid4

import pytest
from django.contrib import admin
from django.test import Client
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.models import DifficultyState, GameDefinition, GameSession
from apps.games.tests.test_api import payload
from apps.games.tests.test_performance import event
from apps.memories.models import Memory
from apps.memories.services import next_question
from apps.routines.models import RoutineItem
from apps.routines.services import materialise_reminders
from apps.shared.tests.factories import FamilyMemberFactory
from apps.shared.tests.types import CareScenario
from apps.sync.tests.test_api import _item

pytestmark = pytest.mark.django_db


def test_deleted_family_and_memories_stay_out_of_patient_views(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    member = FamilyMemberFactory.create(patient=patient)
    memory = Memory.objects.create(
        patient=patient,
        title="Private capsule",
        summary="Story",
        occasion="daily",
        visibility="private",
        uploaded_by=care_scenario["caregiver"],
    )
    memory.people.add(member)
    member.delete()
    assert not memory.people.filter(id=member.id).exists()
    assert next_question(patient)["options"] == []
    api.force_authenticate(patient.user)
    family = api.get(f"/api/v1/patients/{patient.id}/family/")
    assert family.status_code == 200 and family.data == []
    memory.delete()
    assert not patient.memories.exists()
    assert Memory.all_objects.filter(id=memory.id, deleted_at__isnull=False).exists()


@pytest.mark.parametrize("body", [[], [1], "hello", 7, None])
def test_voice_rejects_non_object_json(
    api: APIClient, care_scenario: CareScenario, body: Any
) -> None:
    import json

    api.force_authenticate(care_scenario["patient"].user)
    response = api.generic(
        "POST", "/api/v1/voice/route/", json.dumps(body), content_type="application/json"
    )
    assert response.status_code == 400


@pytest.mark.parametrize("suffix", ["reminders/?date=bad", "family/bad/", "profile/"])
def test_bad_patient_identifiers_and_dates_do_not_crash(
    api: APIClient, care_scenario: CareScenario, suffix: str
) -> None:
    api.force_authenticate(care_scenario["caregiver"])
    patient_id = "bad" if suffix == "profile/" else str(care_scenario["patient"].id)
    response = api.get(f"/api/v1/patients/{patient_id}/{suffix}")
    assert response.status_code in {400, 404, 405}


def test_voice_daily_reminder_roundtrip_and_replay(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    item = _item(str(patient.id))
    today = timezone.localdate()
    item["payload"].update(start_date=today.isoformat(), end_date=None, days_of_week=list(range(7)))
    for _ in range(2):
        result = api.post("/api/v1/sync/push/", {"items": [item]}, format="json")
        assert result.status_code == 200 and result.data["rejected"] == []
    rule = RoutineItem.objects.get(id=item["object_id"])
    assert rule.end_date is None and rule.days_of_week == list(range(7))
    assert len(materialise_reminders(patient, today, days=3)) == 3
    pull = api.get("/api/v1/sync/pull/")
    assert len(pull.data["records"]["reminders"]) == 3
    assert RoutineItem.objects.count() == 1


@pytest.mark.parametrize(
    "bad",
    [
        {"days_of_week": [[1]]},
        {"days_of_week": [True]},
        {"end_date": "2026-01-01"},
        {"time_of_day": "bad"},
    ],
)
def test_malformed_voice_reminder_does_not_poison_sync(
    api: APIClient, care_scenario: CareScenario, bad: dict[str, Any]
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    item, valid = _item(str(patient.id)), _item(str(patient.id))
    item["payload"].update(bad)
    result = api.post("/api/v1/sync/push/", {"items": [item, valid]}, format="json")
    assert result.status_code == 200
    assert len(result.data["rejected"]) == len(result.data["accepted"]) == 1
    assert not RoutineItem.objects.filter(id=item["object_id"]).exists()


@pytest.mark.parametrize("times", ["08:00", ["25:00"], [None], [], ["8"], [[8]]])
def test_bad_prescription_times_are_validation_errors(
    api: APIClient, care_scenario: CareScenario, times: Any
) -> None:
    api.force_authenticate(care_scenario["doctor"])
    result = api.post(
        f"/api/v1/patients/{care_scenario['patient'].id}/medications/",
        {
            "name": "Authored test medicine",
            "dose": "test",
            "times": times,
            "start_date": "2026-09-17",
        },
        format="json",
    )
    assert result.status_code == 400


@pytest.mark.parametrize("rule_fallback", [False, True])
def test_broken_optional_model_history_holds_and_saves(
    api: APIClient, care_scenario: CareScenario, settings: Any, rule_fallback: bool
) -> None:
    patient = care_scenario["patient"]
    game = GameDefinition.objects.get(key="visual_search")
    old = payload()
    GameSession.objects.create(
        patient=patient,
        game=game,
        seed="old",
        level=1,
        metrics={},
        started_at=old["started_at"],
        ended_at=old["ended_at"],
    )
    settings.DDA_MODEL_ARTIFACT = "/unavailable.joblib"
    settings.DDA_RULE_FALLBACK = rule_fallback
    successful = {
        "level": 2,
        "accuracy": 0.97,
        "meanReactionMs": 1200,
        "mistakes": 0,
        "hintsUsed": 0,
        "rounds": 4,
        "completed": True,
        "challengeMode": False,
        "guestMode": False,
        "fatigueFlagged": False,
    }
    DifficultyState.objects.create(patient=patient, game=game, level=2, window=[successful] * 2)
    api.force_authenticate(patient.user)
    checkpoint = api.post("/api/v1/game-events/", event(), format="json")
    assert checkpoint.status_code == 200 and checkpoint.data["adjustment"] == 0
    final = {**payload(), "id": str(uuid4()), "game_key": game.key, "level": 2}
    saved = api.post(f"/api/v1/patients/{patient.id}/game-sessions/", final, format="json")
    assert saved.status_code == 201 and saved.data["state"]["level"] == 2
    assert GameSession.objects.count() == 2


def test_admin_has_password_profile_but_no_otp(care_scenario: CareScenario) -> None:
    user = care_scenario["admin"]
    user.is_superuser = True
    user.save()
    client = Client()
    login = client.get("/admin/login/")
    assert b"otp_token" not in login.content
    client.force_login(user)
    dashboard = client.get("/admin/")
    assert dashboard.status_code == 200 and b"TOTP" not in dashboard.content
    profile = client.get(f"/admin/accounts/user/{user.id}/change/")
    assert profile.status_code == 200
    assert b"id_password" in profile.content and b"otp_token" not in profile.content
    assert b"totp device" not in profile.content.lower()
    assert client.get("/admin/otp_totp/totpdevice/").status_code == 404


def test_staff_caregiver_cannot_enter_admin(care_scenario: CareScenario) -> None:
    user = care_scenario["caregiver"]
    user.is_staff = True
    user.save()
    client = Client()
    client.force_login(user)
    assert client.get("/admin/").status_code == 302


def test_admin_assignment_end_reason_is_form_error(care_scenario: CareScenario) -> None:
    from django.forms import modelform_factory

    from apps.patients.admin import AssignmentForm
    from apps.patients.models import DoctorAssignment

    cls = modelform_factory(
        DoctorAssignment, form=AssignmentForm, fields=["patient", "doctor", "active", "reason"]
    )
    form = cls(
        data={
            "patient": str(care_scenario["patient"].id),
            "doctor": str(care_scenario["doctor"].id),
            "active": False,
            "reason": "",
        }
    )
    assert not form.is_valid() and "reason" in form.errors
    assert (
        "doctor_id"
        in admin.site._registry[care_scenario["patient"].__class__].action_form.base_fields
    )
