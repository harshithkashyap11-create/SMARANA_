from dataclasses import dataclass
from typing import Protocol

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


provider: VoiceProvider = DisabledProvider()


def safe_route(utterance: str, language: str) -> ProviderResult | None:
    result = provider.route(utterance[:500], language)
    if (
        result is None
        or result.intent not in ALLOWED_INTENTS
        or not isinstance(result.confidence, (int, float))
        or result.confidence < 0.7
        or result.confidence > 1
        or not isinstance(result.slots, dict)
        or not all(
            isinstance(key, str) and isinstance(value, str)
            for key, value in result.slots.items()
        )
    ):
        return None
    return result
