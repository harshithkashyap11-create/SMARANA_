"""Replay the observable backend outcomes in the phase 3/5/6 demo scripts."""


import pytest
from django.contrib import admin
from django.test import RequestFactory
from django.utils import timezone
from django_otp.forms import OTPAuthenticationForm
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.admin import SmaranaUserAdmin
from apps.accounts.models import User
from apps.audit.admin import AuditEventAdmin
from apps.audit.models import AuditEvent
from apps.games.models import DifficultyState, GameDefinition
from apps.games.services import save_session
from apps.patients.admin import PatientProfileAdmin
from apps.patients.models import PatientProfile
from apps.shared.tests.factories import DoctorFactory, UserFactory

pytestmark = pytest.mark.django_db


def test_phase3_demo_replay(care_scenario):
    patient = care_scenario["patient"]
    game = GameDefinition.objects.get(key="sequence_recall")
    state = DifficultyState.objects.create(patient=patient, game=game, level=5)
    now = timezone.now()

    def play(accuracy, reaction, **extra):
        state.refresh_from_db()
        return save_session(
            patient,
            patient.user,
            {
                "game_key": game.key,
                "seed": "demo-script",
                "level": state.level,
                "started_at": now,
                "ended_at": now,
                "metrics": {
                    "accuracy": accuracy,
                    "mean_reaction_ms": reaction,
                    "mistakes": 2,
                    "hints_used": 0,
                    "rounds": 4,
                    "duration_ms": 10000,
                    "completed": True,
                    "fatigue_flags": [],
                    "abandoned_reason": None,
                    "raw_events": [],
                    **extra,
                },
            },
        )

    assert play(0.4, 1000)[2] is None
    assert play(0.4, 1000)[2] is None
    change = play(0.4, 1400)[2]
    assert change.reason_code == "demote" and change.from_level == 5 and change.to_level == 4
    for _ in range(2):
        assert play(0.95, 1000)[2] is None
    change = play(0.95, 1000)[2]
    assert change.reason_code == "promote" and change.to_level == 5
    play(0.2, 3000, completed=False, fatigue_flags=["repeated_struggle"])
    state.refresh_from_db()
    assert state.level == 5


def test_phase6_admin_demo_replay(api, care_scenario):
    admin_user = UserFactory(role="admin", is_staff=True, is_superuser=True)
    pending = DoctorFactory(is_approved=False)
    request = RequestFactory().post("/admin/")
    request.user = admin_user
    users = SmaranaUserAdmin(User, admin.site)
    users.approve_selected(request, User.objects.filter(id=pending.id))
    pending.refresh_from_db()
    assert (
        pending.is_approved
        and AuditEvent.objects.filter(action="approve", target_id=pending.id).exists()
    )
    users.deactivate_selected(request, User.objects.filter(id=pending.id))
    pending.refresh_from_db()
    assert not pending.is_active
    patient = care_scenario["patient"]
    request.POST = {"doctor_id": str(care_scenario["other_doctor"].id)}
    PatientProfileAdmin(PatientProfile, admin.site).transfer_doctor(
        request, PatientProfile.objects.filter(id=patient.id)
    )
    original = patient.doctor_assignments.get(doctor=care_scenario["doctor"])
    assert not original.active and original.ended_at and original.reason
    api.force_authenticate(care_scenario["doctor"])
    assert api.get(f"/api/v1/patients/{patient.id}/").status_code == 404
    api.force_authenticate(care_scenario["other_doctor"])
    assert api.get(f"/api/v1/patients/{patient.id}/").status_code == 200
    game = GameDefinition.objects.get(key="memory_match")
    game.active = False
    game.save()
    assert game.key not in {x["key"] for x in api.get("/api/v1/games/").data}
    token = RefreshToken.for_user(care_scenario["caregiver"])
    users.force_logout(request, User.objects.filter(id=care_scenario["caregiver"].id))
    api.force_authenticate(None)
    assert api.post("/api/v1/auth/refresh/", {"refresh": str(token)}).status_code == 401
    users.request_pin_reset(request, User.objects.filter(id=patient.user_id))
    assert patient.alerts.filter(rule_key="pin_reset_request").exists()
    count = AuditEvent.objects.count()
    AuditEventAdmin(AuditEvent, admin.site).export_selected(request, AuditEvent.objects.all())
    assert AuditEvent.objects.count() == count + 1
    assert AuditEvent.objects.first().action == "export"


def test_phase6_otp_requires_authenticator():
    admin_user = UserFactory(role="admin", is_staff=True, is_superuser=True)
    device = TOTPDevice.objects.create(user=admin_user, name="demo", confirmed=True)
    request = RequestFactory().post("/admin/login/")
    data = {"username": admin_user.username, "password": "test-password"}
    assert not OTPAuthenticationForm(request, data=data).is_valid()
    token = str(totp(device.bin_key, step=device.step, t0=device.t0, digits=device.digits))
    data.update({"otp_device": device.persistent_id, "otp_token": token})
    form = OTPAuthenticationForm(request, data=data)
    assert form.is_valid(), form.errors
    assert form.get_user().otp_device.pk == device.pk
