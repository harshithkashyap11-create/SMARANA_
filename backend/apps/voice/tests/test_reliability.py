import json
from email.message import Message
from io import BytesIO
from typing import Any
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import pytest
from django.test import override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import User
from apps.voice.providers import (
    GAME_CONTRACT,
    GAMES,
    OllamaProvider,
    ProviderResult,
    ollama_readiness,
    safe_route,
    short_chat_response,
    valid_result,
)
from apps.voice.views import ReadinessView, RouteView


def test_game_contract_contains_all_twelve_integrated_games() -> None:
    expected = {
        "sequence_recall",
        "memory_match",
        "find_the_change",
        "object_sorting",
        "daily_routine",
        "word_recall",
        "visual_search",
        "pattern_completion",
        "spatial_recall",
        "attention_tap",
        "association_game",
        "personal_memory",
    }
    assert expected <= GAMES
    assert len({game["id"] for game in GAME_CONTRACT}) == len(GAME_CONTRACT)
    for game in expected:
        assert valid_result(ProviderResult("start_game", {"game": game}, 0.99))


@pytest.mark.parametrize(
    "intent,slots",
    [
        ("sos", {}),
        ("set_reminder", {"title": "water", "time": "20:00"}),
        ("open_section", {"section": "home"}),
        ("start_game", {"game": "memory_match"}),
        ("medicines_today", {}),
        ("stop_game", {}),
        ("call_person", {"name": "Priya"}),
    ],
)
def test_llm_cannot_return_executable_application_command(
    intent: str, slots: dict[str, str]
) -> None:
    with patch(
        "apps.voice.providers.provider.route", return_value=ProviderResult(intent, slots, 0.99)
    ):
        assert safe_route("test", "en") is None


def test_short_answer_summarizes_by_complete_sentences_and_rejects_oversize() -> None:
    assert short_chat_response("One. Two. Three. Four.") == "One. Two. Three."
    assert short_chat_response("word " * 200) is None
    assert short_chat_response("Visit https://example.invalid") is None


@override_settings(
    LOCAL_LLM_PROVIDER="ollama",
    LOCAL_LLM_URL="http://127.0.0.1:11434",
    LOCAL_LLM_MODEL="test:latest",
    LOCAL_LLM_TIMEOUT=2,
)
@pytest.mark.parametrize(
    "body,status",
    [
        ({"models": [{"name": "test:latest"}]}, "ready"),
        ({"models": []}, "model_missing"),
        ({"models": "wrong"}, "invalid_response"),
    ],
)
def test_readiness_model_states(body: dict[str, Any], status: str) -> None:
    with (
        patch("apps.voice.providers.urlopen", return_value=BytesIO(json.dumps(body).encode())),
        patch("apps.voice.providers.shutil.which", return_value="/bin/ollama"),
    ):
        assert ollama_readiness()["status"] == status


@override_settings(LOCAL_LLM_PROVIDER="ollama", LOCAL_LLM_URL="http://127.0.0.1:11434")
@pytest.mark.parametrize(
    "installed,error,status",
    [
        (None, URLError("connection refused"), "not_installed"),
        ("/bin/ollama", URLError("connection refused"), "service_unavailable"),
        ("/bin/ollama", TimeoutError(), "timeout"),
    ],
)
def test_readiness_unavailable_states(installed: str | None, error: Exception, status: str) -> None:
    with (
        patch("apps.voice.providers.urlopen", side_effect=error),
        patch("apps.voice.providers.shutil.which", return_value=installed),
    ):
        assert ollama_readiness()["status"] == status


@override_settings(
    LOCAL_LLM_PROVIDER="ollama",
    LOCAL_LLM_MODEL="test",
    LOCAL_LLM_URL="http://localhost:11434",
    LOCAL_LLM_TIMEOUT=1,
)
@pytest.mark.parametrize(
    "error",
    [URLError("refused"), TimeoutError(), HTTPError("url", 404, "model missing", Message(), None)],
)
def test_ollama_failures_return_no_response(error: Exception) -> None:
    with patch("apps.voice.providers.urlopen", side_effect=error):
        assert OllamaProvider().route("What is memory?", "en") is None


@override_settings(LOCAL_LLM_PROVIDER="ollama", VOICE_LLM_FALLBACK=False)
def test_authenticated_api_chat_and_readiness_without_database() -> None:
    user = User(username="voice-test-user", role=User.Role.PATIENT)
    factory = APIRequestFactory()
    request = factory.post(
        "/api/v1/voice/route/", {"utterance": "What is memory?", "language": "en"}, format="json"
    )
    force_authenticate(request, user=user)
    with patch(
        "apps.voice.providers.provider.route",
        return_value=ProviderResult(
            "general_chat", {"response": "Memory helps us remember."}, 0.9, "LOCAL_LLM"
        ),
    ):
        response = RouteView.as_view()(request)
    assert response.status_code == 200
    assert response.data["intent"] == "general_chat"
    request = factory.get("/api/v1/voice/readiness/")
    force_authenticate(request, user=user)
    with patch("apps.voice.views.ollama_readiness", return_value={"status": "model_missing"}):
        response = ReadinessView.as_view()(request)
    assert response.data == {"local": {"status": "model_missing"}, "cloud_enabled": False}
