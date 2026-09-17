from typing import cast
from unittest.mock import patch

import pytest
from django.test import override_settings
from pytest_django.fixtures import Settings
from rest_framework.test import APIClient

from apps.shared.tests.types import CareScenario
from apps.voice.providers import ProviderResult

pytestmark = pytest.mark.django_db


@override_settings(VOICE_LLM_FALLBACK=True)
def test_low_confidence_provider_result_is_not_returned(
    api: APIClient, care_scenario: CareScenario
) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    with patch(
        "apps.voice.providers.provider.route",
        return_value=ProviderResult("open_section", {"section": "memories"}, 0.69),
    ):
        response = api.post(
            "/api/v1/voice/route/",
            {"utterance": "show photographs", "language": "en"},
            format="json",
        )

    assert response.status_code == 200
    assert response.data == {"intent": None, "slots": {}, "confidence": 0}


@override_settings(VOICE_LLM_FALLBACK=True)
def test_provider_can_only_return_allowlisted_structured_intent(
    api: APIClient, care_scenario: CareScenario
) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    with patch(
        "apps.voice.providers.provider.route",
        return_value=ProviderResult("free_text", {"answer": "unsafe"}, 0.99),
    ):
        response = api.post(
            "/api/v1/voice/route/",
            {"utterance": "diagnose me", "language": "en"},
            format="json",
        )

    assert response.data == {"intent": None, "slots": {}, "confidence": 0}


@override_settings(VOICE_LLM_FALLBACK=True)
def test_provider_cannot_return_unstructured_slots(
    api: APIClient, care_scenario: CareScenario
) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    with patch(
        "apps.voice.providers.provider.route",
        return_value=ProviderResult("open_section", cast(dict[str, str], {"section": 3}), 0.99),
    ):
        response = api.post(
            "/api/v1/voice/route/",
            {"utterance": "show photographs", "language": "en"},
            format="json",
        )

    assert response.data == {"intent": None, "slots": {}, "confidence": 0}


def test_configured_router_handles_provider_outages_and_malformed_replies(
    settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    import json
    from io import BytesIO

    from apps.voice.providers import HttpJsonProvider

    settings.VOICE_ROUTER_ENDPOINT = "https://configured-provider.invalid/route"
    provider = HttpJsonProvider()
    monkeypatch.setattr(
        "apps.voice.providers.urlopen",
        lambda *args, **kwargs: BytesIO(
            json.dumps({"intent": "help", "slots": {}, "confidence": 0.9}).encode()
        ),
    )
    result = provider.route("help", "en")
    assert result is not None and result.intent == "help"
    monkeypatch.setattr(
        "apps.voice.providers.urlopen", lambda *args, **kwargs: BytesIO(b"invalid json")
    )
    assert provider.route("help", "en") is None


@override_settings(VOICE_LLM_FALLBACK=False, LOCAL_LLM_PROVIDER="ollama")
def test_local_route_works_without_cloud_enabled(
    api: APIClient, care_scenario: CareScenario
) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    with patch(
        "apps.voice.providers.provider.route",
        return_value=ProviderResult(
            "general_chat", {"response": "Games can be enjoyable."}, 0.91, "LOCAL_LLM"
        ),
    ):
        response = api.post(
            "/api/v1/voice/route/",
            {"utterance": "how have I done in games", "language": "en"},
            format="json",
        )
    assert response.status_code == 200
    assert response.data["source"] == "LOCAL_LLM"


@override_settings(VOICE_LLM_FALLBACK=True)
def test_malformed_request_is_rejected(api: APIClient, care_scenario: CareScenario) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    response = api.post(
        "/api/v1/voice/route/", {"utterance": "hello", "language": ["en"]}, format="json"
    )
    assert response.status_code == 400
