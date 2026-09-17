import json
from io import BytesIO
from unittest.mock import patch

import pytest
from django.test import override_settings

from apps.voice.providers import (
    HybridProvider,
    OllamaProvider,
    ProviderResult,
    safe_route,
    valid_result,
)


@pytest.mark.parametrize(
    "result",
    [
        ProviderResult("open_section", {"section": "https://evil.invalid"}, 0.99),
        ProviderResult("start_game", {"game": "../../admin"}, 0.99),
        ProviderResult("help", {}, float("nan")),
        ProviderResult("help", {}, True),
        ProviderResult("set_reminder", {"title": "water", "time": "25:00"}, 0.99),
    ],
)
def test_rejects_unsafe_results(result: ProviderResult) -> None:
    assert not valid_result(result)


@override_settings(
    LOCAL_LLM_PROVIDER="ollama",
    LOCAL_LLM_MODEL="small-model",
    LOCAL_LLM_URL="http://localhost:11434",
    LOCAL_LLM_TIMEOUT=1,
)
def test_local_model_structured_response() -> None:
    reply = {
        "message": {
            "content": json.dumps(
                {
                    "intent": "general_chat",
                    "slots": {"response": "Games can be enjoyable."},
                    "confidence": 0.91,
                }
            )
        }
    }
    with patch(
        "apps.voice.providers.urlopen", return_value=BytesIO(json.dumps(reply).encode())
    ) as http:
        result = OllamaProvider().route("how have I been doing in games", "en")
    assert result is not None
    assert result.source == "LOCAL_LLM"
    assert result.slots == {"response": "Games can be enjoyable."}
    assert json.loads(http.call_args.args[0].data)["stream"] is False


@override_settings(VOICE_LLM_FALLBACK=True)
def test_local_precedes_cloud_and_cloud_only_on_failure() -> None:
    local = ProviderResult("general_chat", {"response": "Hello."}, 0.95, "LOCAL_LLM")
    with (
        patch.object(OllamaProvider, "route", return_value=local),
        patch("apps.voice.providers.HttpJsonProvider.route") as cloud,
    ):
        assert HybridProvider().route("help", "en") == local
        cloud.assert_not_called()
    with (
        patch.object(OllamaProvider, "route", return_value=None),
        patch("apps.voice.providers.HttpJsonProvider.route", return_value=local) as cloud,
    ):
        assert HybridProvider().route("help", "en") == local
        cloud.assert_called_once()


def test_provider_exception_does_not_escape() -> None:
    with patch("apps.voice.providers.provider.route", side_effect=TimeoutError):
        assert safe_route("hello", "en") is None


@override_settings(LOCAL_LLM_PROVIDER="ollama")
def test_local_failure_and_malformed_reply() -> None:
    with patch("apps.voice.providers.urlopen", side_effect=TimeoutError):
        assert OllamaProvider().route("hello", "en") is None
    with patch("apps.voice.providers.urlopen", return_value=BytesIO(b"not json")):
        assert OllamaProvider().route("hello", "en") is None
