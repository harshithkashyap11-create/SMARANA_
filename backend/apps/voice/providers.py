import json
import logging
from dataclasses import dataclass
from typing import Protocol
from urllib.request import Request, urlopen

from django.conf import settings

ALLOWED_INTENTS = {
    "open_section",
    "start_game",
    "medicines_today",
    "next_activity",
    "set_reminder",
    "call_person",
    "read_this",
    "speak_slowly",
    "speak_normally",
    "help",
    "sos",
    "switch_language",
}


@dataclass(frozen=True)
class ProviderResult:
    intent: str
    slots: dict[str, str]
    confidence: float


class VoiceProvider(Protocol):
    def route(self, utterance: str, language: str) -> ProviderResult | None: ...


class DisabledProvider:
    def route(self, utterance: str, language: str) -> ProviderResult | None:
        return None


class HttpJsonProvider:
    """Optional configured command router; no patient context or secrets in payload."""

    def route(self, utterance: str, language: str) -> ProviderResult | None:
        endpoint = getattr(settings, "VOICE_ROUTER_ENDPOINT", "")
        if not endpoint:
            return None
        headers = {"Content-Type": "application/json"}
        token = getattr(settings, "VOICE_ROUTER_TOKEN", "")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = Request(
            endpoint,
            data=json.dumps({"utterance": utterance, "language": language}).encode(),
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(request, timeout=3) as response:
                # Limit the reply so an accidental large response cannot exhaust memory.
                raw = response.read(16_385)
                if len(raw) > 16_384:
                    return None
                data = json.loads(raw)
            if not isinstance(data, dict):
                return None
            intent, slots, confidence = (
                data.get("intent"),
                data.get("slots"),
                data.get("confidence"),
            )
            if (
                not isinstance(intent, str)
                or not isinstance(slots, dict)
                or not isinstance(confidence, (int, float))
            ):
                return None
            typed_slots: dict[str, str] = {}
            for key, value in slots.items():
                if not isinstance(key, str) or not isinstance(value, str):
                    return None
                typed_slots[key] = value
            return ProviderResult(intent, typed_slots, float(confidence))
        except Exception:
            logging.getLogger(__name__).warning("voice_router_unavailable")
            return None


provider: VoiceProvider = HttpJsonProvider()


def safe_route(utterance: str, language: str) -> ProviderResult | None:
    result = provider.route(utterance[:500], language)
    if (
        result is None
        or not isinstance(result.intent, str)
        or result.intent not in ALLOWED_INTENTS
        or not isinstance(result.confidence, (int, float))
        or result.confidence < 0.7
        or result.confidence > 1
        or not isinstance(result.slots, dict)
        or not all(
            isinstance(key, str) and isinstance(value, str) for key, value in result.slots.items()
        )
    ):
        return None
    return result
