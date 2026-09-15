from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.alerts.models import Alert
from apps.games.models import GameDefinition, GameSession
from apps.shared.tests.factories import DoctorAssignmentFactory, DoctorFactory, PatientFactory

pytestmark = pytest.mark.django_db


def test_dashboard_is_scoped_counts_flags_and_computes_engagement() -> None:
    doctor = DoctorFactory()
    active = PatientFactory(user__display_name="Active patient")
    quiet = PatientFactory(user__display_name="Quiet patient")
    inactive = PatientFactory(user__display_name="Inactive patient")
    unassigned = PatientFactory(user__display_name="Hidden patient")
    for patient in (active, quiet, inactive):
        DoctorAssignmentFactory(doctor=doctor, patient=patient)
    game = GameDefinition.objects.create(key="memory", name="Memory")
    now = timezone.now()
    for patient, age in ((active, 3), (quiet, 7), (unassigned, 1)):
        GameSession.objects.create(
            patient=patient,
            game=game,
            seed=str(patient.id),
            level=1,
            started_at=now - timedelta(days=age, minutes=5),
            ended_at=now - timedelta(days=age),
        )
    for rule_key in (Alert.RuleKey.NO_LOGIN_2D, Alert.RuleKey.LEVEL_DROP_X3):
        Alert.objects.create(
            patient=active,
            rule_key=rule_key,
            severity=Alert.Severity.ATTENTION,
            title=rule_key,
            explanation="Review this pattern.",
        )

    client = APIClient()
    client.force_authenticate(doctor)
    response = client.get("/api/v1/doctor/dashboard/")

    assert response.status_code == 200
    assert [row["name"] for row in response.data["patients"]] == [
        "Active patient",
        "Inactive patient",
        "Quiet patient",
    ]
    by_name = {row["name"]: row for row in response.data["patients"]}
    assert by_name["Active patient"]["engagement_status"] == "active"
    assert by_name["Quiet patient"]["engagement_status"] == "quiet"
    assert by_name["Inactive patient"]["engagement_status"] == "inactive"
    assert by_name["Active patient"]["flag_count"] == 2
    assert [row["name"] for row in response.data["needs_attention"]] == ["Active patient"]
    assert response.data["reviews_due"] == []
    assert len(response.data["recent_completed"]) == 2


def test_dashboard_rejects_non_doctor_and_unassigned_detail_is_404() -> None:
    doctor = DoctorFactory()
    assigned = PatientFactory()
    hidden = PatientFactory()
    DoctorAssignmentFactory(doctor=doctor, patient=assigned)
    client = APIClient()
    client.force_authenticate(doctor)

    assert client.get(f"/api/v1/patients/{assigned.id}/").status_code == 200
    assert client.get(f"/api/v1/patients/{hidden.id}/").status_code == 404

    client.force_authenticate(assigned.user)
    assert client.get("/api/v1/doctor/dashboard/").status_code == 404
