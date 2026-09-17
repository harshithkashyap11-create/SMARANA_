import json
import logging
import math
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
    "stop_game",
    "stop_listening",
    "time_query",
    "date_query",
    "general_chat",
}


@dataclass(frozen=True)
class ProviderResult:
    intent: str
    slots: dict[str, str]
    confidence: float
    source: str = "CLOUD_LLM"


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


SECTIONS = {
    "home",
    "games",
    "reminders",
    "routine",
    "profile",
    "settings",
    "progress",
    "caregiver",
    "people",
    "memories",
    "medicines",
    "calm-time",
    "sleep",
}
GAMES = {
    "memory_match",
    "sequence_recall",
    "object_sorting",
    "tea_garden_attention",
    "bihu_rhythm_recall",
    "daily_life_sequencing",
    "familiar_place_recall",
    "who_is_this",
    "word_pairs",
    "festival_calendar",
    "sound_match",
    "spot_the_change",
}


def valid_result(result: ProviderResult | None) -> bool:
    import re

    if (
        result is None
        or not isinstance(result.intent, str)
        or result.intent not in ALLOWED_INTENTS
        or isinstance(result.confidence, bool)
        or not isinstance(result.confidence, (int, float))
        or not math.isfinite(result.confidence)
        or not 0.8 <= result.confidence <= 1
    ):
        return False
    if not isinstance(result.slots, dict) or not all(
        isinstance(k, str) and isinstance(v, str) and len(v) <= 2000
        for k, v in result.slots.items()
    ):
        return False
    slots = result.slots
    if result.intent == "open_section":
        return slots.get("section") in SECTIONS
    if result.intent == "start_game":
        return not slots.get("game") or slots["game"] in GAMES
    if result.intent == "set_reminder":
        if "date" in slots:
            from datetime import date

            try:
                if date.fromisoformat(slots["date"]).isoformat() != slots["date"]:
                    return False
            except ValueError:
                return False
        return bool(
            slots.get("title", "").strip()
            and re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", slots.get("time", ""))
        )
    if result.intent == "switch_language":
        return slots.get("language") in {"en", "as", "bn", "hi", "te", "mni", "lus"}
    if result.intent == "call_person":
        return bool(slots.get("name", "").strip())
    if result.intent == "general_chat":
        return bool(slots.get("response", "").strip())
    return True


class OllamaProvider:
    """A bounded local inference request, never executable browser instructions."""

    def route(self, utterance: str, language: str) -> ProviderResult | None:
        if getattr(settings, "LOCAL_LLM_PROVIDER", "") != "ollama":
            return None
        prompt = (
            "You are Smarana. Return JSON only: intent, confidence (0 to 1), "
            "slots (string values). "
            f"Allowed intents: {sorted(ALLOWED_INTENTS)}. "
            f"For open_section use slots.section from {sorted(SECTIONS)}. "
            f"For start_game use slots.game from {sorted(GAMES)} or omit it. "
            "For set_reminder require title and HH:MM time; do not invent missing details. "
            "For general_chat use slots.response, a short friendly answer. "
            "Never give medical diagnoses or treatment advice. "
            "Never return code, URLs or instructions to execute. Use low confidence if uncertain. "
            f"Reply in language {language}."
        )
        payload = {
            "model": settings.LOCAL_LLM_MODEL,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0, "num_predict": 350},
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": utterance},
            ],
        }
        request = Request(
            settings.LOCAL_LLM_URL.rstrip("/") + "/api/chat",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=settings.LOCAL_LLM_TIMEOUT) as response:
                raw = response.read(16385)
            if len(raw) > 16384:
                return None
            data = json.loads(json.loads(raw)["message"]["content"])
            if not isinstance(data, dict):
                return None
            result = ProviderResult(
                data.get("intent"), data.get("slots"), data.get("confidence"), "LOCAL_LLM"
            )
            return result if valid_result(result) else None
        except Exception:
            logging.getLogger(__name__).warning("local_voice_router_unavailable")
            return None


class HybridProvider:
    def route(self, utterance: str, language: str) -> ProviderResult | None:
        result = OllamaProvider().route(utterance, language)
        if valid_result(result):
            return result
        if getattr(settings, "VOICE_LLM_FALLBACK", False):
            return HttpJsonProvider().route(utterance, language)
        return None


provider: VoiceProvider = HybridProvider()


def safe_route(utterance: str, language: str) -> ProviderResult | None:
    try:
        result = provider.route(utterance[:500], language)
    except Exception:
        logging.getLogger(__name__).warning("voice_provider_failed")
        return None
    return result if valid_result(result) else None
