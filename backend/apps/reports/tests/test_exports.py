from datetime import timedelta
from io import BytesIO

import pytest
from django.utils import timezone
from pypdf import PdfReader

from apps.audit.models import AuditEvent
from apps.clinical.models import ClinicalBaseline, ClinicalNote
from apps.games.models import GameDefinition, GameSession
from apps.patients.models import FamilyMember
from apps.routines.models import Medication

pytestmark = pytest.mark.django_db


def text(response):
    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert response["Cache-Control"] == "private, no-store"
    return "\n".join(x.extract_text() for x in PdfReader(BytesIO(response.content)).pages)


def test_report_sections_visibility_audit_and_permissions(api, care_scenario):
    patient = care_scenario["patient"]
    ClinicalNote.objects.create(
        patient=patient,
        author=care_scenario["doctor"],
        category="general",
        visibility="doctor_only",
        text="PRIVATE_DOCTOR_TEXT",
    )
    ClinicalNote.objects.create(
        patient=patient,
        author=care_scenario["doctor"],
        category="follow_up",
        visibility="care_team",
        text="Shared recommendation",
    )
    ClinicalNote.objects.create(
        patient=patient,
        author=care_scenario["caregiver"],
        category="caregiver_feedback",
        text="Walk in the garden",
    )
    game = GameDefinition.objects.create(
        key="report_test", name="Report activity", cognitive_domains=["memory"]
    )
    now = timezone.now()
    for guest in [False, True]:
        GameSession.objects.create(
            patient=patient,
            game=game,
            seed="test",
            level=1,
            guest_mode=guest,
            started_at=now - timedelta(minutes=2),
            ended_at=now,
            metrics={"completed": True, "accuracy": 0.8, "mean_reaction_ms": 1200},
        )
    url = f"/api/v1/patients/{patient.id}/report/"
    for role in ["caregiver", "doctor"]:
        api.force_authenticate(care_scenario[role])
        response = api.get(url)
        content = text(response)
        for section in [
            "Profile and period",
            "Sessions",
            "Domain trends",
            "Difficulty history",
            "Adherence",
            "Flags",
            "Caregiver notes",
            "Doctor recommendations",
            "Next review",
        ]:
            assert section in content
        assert "Engagement and tracking support, not a diagnosis." in content
        assert "Shared recommendation" in content and "Walk in the garden" in content
        assert ("PRIVATE_DOCTOR_TEXT" in content) == (role == "doctor")
        assert "1 sessions. Practice excluded." in content
        assert AuditEvent.objects.filter(
            actor=care_scenario[role], action="export", patient=patient, changes__kind="report"
        ).exists()
    for user in [patient.user, care_scenario["other_doctor"], care_scenario["other_caregiver"]]:
        api.force_authenticate(user)
        assert api.get(url).status_code == 404
    assert AuditEvent.objects.filter(action="export").count() == 2
    api.force_authenticate(care_scenario["caregiver"])
    for query in [
        "?from=nope",
        "?from=2026-02-30",
        "?from=2025-01-01&to=2026-09-16",
        "?from=2026-09-16&to=2026-09-01",
    ]:
        assert api.get(url + query).status_code == 400
    today = timezone.localdate()
    content = text(
        api.get(url + f"?from={today - timedelta(days=2)}&to={today - timedelta(days=1)}")
    )
    assert "Report activity" not in content and "PRIVATE_DOCTOR_TEXT" not in content


def test_emergency_card_contains_medications_allergies_contacts(api, care_scenario):
    patient = care_scenario["patient"]
    ClinicalBaseline.objects.create(
        patient=patient, allergies="Penicillin", recorded_by=care_scenario["doctor"]
    )
    Medication.objects.create(
        patient=patient,
        name="Demo medicine",
        dose="5 mg",
        times=["08:00"],
        instructions="With food",
        prescribed_by=care_scenario["doctor"],
        start_date=timezone.localdate(),
    )
    FamilyMember.objects.create(
        patient=patient,
        name="Priya contact",
        relationship="daughter",
        phone="+911234567890",
        is_emergency_contact=True,
    )
    api.force_authenticate(care_scenario["caregiver"])
    response = api.get(f"/api/v1/patients/{patient.id}/emergency-card/")
    content = text(response)
    for value in [
        "Emergency Card",
        "Penicillin",
        "Demo medicine",
        "5 mg",
        "08:00",
        "With food",
        "Priya contact",
        "+911234567890",
    ]:
        assert value in content
    assert len(PdfReader(BytesIO(response.content)).pages) == 1
    assert AuditEvent.objects.filter(
        action="export", patient=patient, changes__kind="emergency_card"
    ).exists()
