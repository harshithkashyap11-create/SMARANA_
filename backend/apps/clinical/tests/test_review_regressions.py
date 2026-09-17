import pytest
from rest_framework.test import APIClient

from apps.clinical.models import ClinicalNote
from apps.shared.tests.types import CareScenario

pytestmark = pytest.mark.django_db


def test_note_cannot_reply_to_other_patient(api: APIClient, care_scenario: CareScenario) -> None:
    doctor = care_scenario["doctor"]
    patient = care_scenario["patient"]
    other = care_scenario["other_patient"]
    note = ClinicalNote.objects.create(
        patient=other, author=doctor, category="general", text="Private note"
    )
    api.force_authenticate(doctor)
    result = api.post(
        f"/api/v1/patients/{patient.id}/notes/",
        {"category": "general", "text": "Reply", "reply_to": str(note.id)},
        format="json",
    )
    assert result.status_code == 400


@pytest.mark.parametrize("body", [{}, {"action": "set_level", "value": "bad", "reason": "Review"}])
def test_malformed_override_is_400(
    api: APIClient, care_scenario: CareScenario, body: dict[str, object]
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(care_scenario["doctor"])
    result = api.post(
        f"/api/v1/patients/{patient.id}/difficulty/memory_match/override/", body, format="json"
    )
    assert result.status_code == 400
