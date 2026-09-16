from unittest.mock import patch

import pytest
from django.test import override_settings

from apps.voice.providers import ProviderResult

pytestmark = pytest.mark.django_db


@override_settings(VOICE_LLM_FALLBACK=True)
def test_low_confidence_provider_result_is_not_returned(api, care_scenario) -> None:
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
def test_provider_can_only_return_allowlisted_structured_intent(api, care_scenario) -> None:
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
def test_provider_cannot_return_unstructured_slots(api, care_scenario) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    with patch(
        "apps.voice.providers.provider.route",
        return_value=ProviderResult("open_section", {"section": 3}, 0.99),
    ):
        response = api.post(
            "/api/v1/voice/route/",
            {"utterance": "show photographs", "language": "en"},
            format="json",
        )

    assert response.data == {"intent": None, "slots": {}, "confidence": 0}


def test_configured_router_handles_provider_outages_and_malformed_replies(settings, monkeypatch):
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
    assert provider.route("help", "en").intent == "help"
    monkeypatch.setattr(
        "apps.voice.providers.urlopen", lambda *args, **kwargs: BytesIO(b"invalid json")
    )
    assert provider.route("help", "en") is None
