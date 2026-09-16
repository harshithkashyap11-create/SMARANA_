from datetime import timedelta
from uuid import uuid4

import pytest
from django.utils import timezone

from apps.alerts.models import Alert, CheckIn, CheckInResponse, NotificationPreference
from apps.alerts.notify import notify_alert
from apps.alerts.rules import engagement_drop, reaction_time_worsening
from apps.games.models import GameDefinition, GameSession

pytestmark = pytest.mark.django_db


def session(patient, game, days, reaction=1000, guest=False):
    stamp = timezone.now() - timedelta(days=days)
    return GameSession.objects.create(
        patient=patient,
        game=game,
        seed="test",
        level=1,
        started_at=stamp - timedelta(minutes=2),
        ended_at=stamp,
        guest_mode=guest,
        metrics={"completed": True, "mean_reaction_ms": reaction, "accuracy": 0.8},
    )


def test_rule_boundaries_and_guest_exclusion(care_scenario):
    patient = care_scenario["patient"]
    game = GameDefinition.objects.create(key="test", name="Test")
    now = timezone.now()
    for days in [8, 9, 10, 11]:
        session(patient, game, days)
    for days in [1, 2]:
        session(patient, game, days, 1300)
    assert engagement_drop(patient, now)
    assert reaction_time_worsening(patient, now) is None
    session(patient, game, 3, 1300, guest=True)
    assert reaction_time_worsening(patient, now) is None
    session(patient, game, 3, 1299)
    assert engagement_drop(patient, now) is None
    assert reaction_time_worsening(patient, now) is None
    patient.game_sessions.filter(guest_mode=False, ended_at__gte=now - timedelta(days=7)).update(
        metrics={"completed": True, "mean_reaction_ms": 1300}
    )
    draft = reaction_time_worsening(patient, now)
    assert draft and draft.evidence["games"][0]["baseline_ms"] == 1000
    patient.game_sessions.filter(guest_mode=False, ended_at__gte=now - timedelta(days=7)).update(
        game=GameDefinition.objects.create(key="other", name="Other")
    )
    assert reaction_time_worsening(patient, now) is None


def test_preferences_owned_and_delivery_respected(api, care_scenario, mailoutbox):
    caregiver = care_scenario["caregiver"]
    api.force_authenticate(caregiver)
    for channel in ["in_app", "email"]:
        response = api.post(
            "/api/v1/notification-preferences/",
            {"channel": channel, "rule_key": "sos", "enabled": False},
        )
        assert response.status_code == 201
    assert (
        api.post(
            "/api/v1/notification-preferences/",
            {"channel": "sms", "rule_key": "sos", "enabled": True},
        ).status_code
        == 400
    )
    row = NotificationPreference.objects.filter(user=caregiver, channel="in_app").first()
    api.force_authenticate(care_scenario["other_caregiver"])
    assert (
        api.patch(f"/api/v1/notification-preferences/{row.id}/", {"enabled": True}).status_code
        == 404
    )
    alert = Alert.objects.create(
        patient=care_scenario["patient"],
        rule_key="sos",
        severity="high",
        title="Help",
        explanation="Help",
    )
    notify_alert(alert)
    assert alert.notified == [] and not mailoutbox
    row.enabled = True
    row.save()
    notify_alert(alert)
    notify_alert(alert)
    assert len(alert.notified) == 1


def test_checkin_sync_ownership_and_replay(api, care_scenario):
    patient = care_scenario["patient"]
    url = f"/api/v1/patients/{patient.id}/checkins/"
    api.force_authenticate(care_scenario["other_caregiver"])
    assert api.post(url).status_code == 404
    api.force_authenticate(care_scenario["caregiver"])
    response = api.post(url)
    assert response.status_code == 201
    assert api.post(url).data["id"] == response.data["id"]
    checkin_id = response.data["id"]
    api.force_authenticate(patient.user)
    assert api.get("/api/v1/sync/pull/").data["records"]["checkins"][0]["id"] == checkin_id
    response_id = str(uuid4())
    payload = {
        "id": response_id,
        "patient_id": str(patient.id),
        "checkin": checkin_id,
        "answer": "need_help",
        "responded_at": timezone.now().isoformat(),
        "device_updated_at": timezone.now().isoformat(),
    }
    item = {
        "outbox_id": str(uuid4()),
        "model": "checkin_response",
        "object_id": response_id,
        "patient_id": str(patient.id),
        "idempotency_key": response_id,
        "payload": payload,
    }
    for _ in range(2):
        result = api.post("/api/v1/sync/push/", {"items": [item]}, format="json")
        assert len(result.data["accepted"]) == 1
    assert CheckInResponse.objects.count() == 1
    assert patient.alerts.filter(rule_key="checkin_help").exists()
    other = CheckIn.objects.create(
        patient=care_scenario["other_patient"], requested_by=care_scenario["other_caregiver"]
    )
    item["object_id"] = item["idempotency_key"] = item["payload"]["id"] = str(uuid4())
    item["payload"]["checkin"] = str(other.id)
    assert api.post("/api/v1/sync/push/", {"items": [item]}, format="json").data["rejected"]
    assert CheckInResponse.objects.count() == 1


def test_preference_crud_defaults_and_duplicate_patch(api, care_scenario):
    api.force_authenticate(care_scenario["caregiver"])
    first = api.post(
        "/api/v1/notification-preferences/", {"channel": "in_app", "rule_key": "engagement_drop"}
    )
    assert first.status_code == 201 and first.data["enabled"]
    second = api.post(
        "/api/v1/notification-preferences/",
        {"channel": "email", "rule_key": "engagement_drop", "enabled": False},
    )
    url = f"/api/v1/notification-preferences/{first.data['id']}/"
    assert api.get(url).data["enabled"]
    assert api.patch(url, {"channel": "email"}).status_code == 400
    assert api.patch(url, {"enabled": False}).status_code == 200
    assert not api.get(url).data["enabled"]
    assert api.delete(url).status_code == 204
    assert NotificationPreference.objects.filter(id=first.data["id"]).exists()
    assert second.status_code == 201
