from typing import Any

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import path
from rest_framework.test import APIClient

from apps.memories.models import Memory, MemoryMedia
from apps.patients.media_views import LocalMediaView
from apps.patients.models import ConsentSettings
from apps.shared.tests.types import CareScenario

urlpatterns = [path("media/<path:name>", LocalMediaView.as_view())]
pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "role,allowed",
    [
        ("patient", True),
        ("caregiver", True),
        ("other_patient", False),
        ("other_caregiver", False),
        ("doctor", False),
        ("admin", False),
    ],
)
def test_local_photo_requires_assignment_and_consent(
    api: APIClient, care_scenario: CareScenario, settings: Any, role: str, allowed: bool
) -> None:
    settings.ROOT_URLCONF = __name__
    patient = care_scenario["patient"]
    memory = Memory.objects.create(
        patient=patient,
        uploaded_by=care_scenario["caregiver"],
        title="Private family photo",
        summary="Personal",
        occasion="daily",
        visibility="care_team",
    )
    media = MemoryMedia.objects.create(
        memory=memory, file=SimpleUploadedFile("family.jpg", b"photo")
    )
    url = f"/media/{media.file.name}"
    assert api.get(url).status_code == 401
    principals: dict[str, Any] = dict(care_scenario)
    principal = principals[role]
    api.force_authenticate(getattr(principal, "user", principal))
    response = api.get(url)
    assert response.status_code == (200 if allowed else 404)
    if allowed:
        assert response["Cache-Control"] == "private, no-store"
        response.close()
    if role == "doctor":
        ConsentSettings.objects.create(patient=patient, share_memories_with_doctor=True)
        shared = api.get(url)
        assert shared.status_code == 200
        memory.delete()
        assert api.get(url).status_code == 404
        shared.close()
