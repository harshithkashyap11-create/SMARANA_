import { apiClient } from "../api/client";
import type { RoutedIntent } from "./router";
import type { VoiceLanguage } from "./stt";
import { gameKeysAllowed, sectionRoutes } from "./registry";
const intents = new Set([
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
]);
export async function routeWithFallback(
  utterance: string,
  language: VoiceLanguage,
): Promise<RoutedIntent | null> {
  if (import.meta.env.VITE_VOICE_LLM_FALLBACK !== "1" || !navigator.onLine)
    return null;
  const result = await apiClient<{
    intent: RoutedIntent["intent"] | null;
    slots: Record<string, string>;
    confidence: number;
    source?: "LOCAL_LLM" | "CLOUD_LLM";
  }>("/api/v1/voice/route/", {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ utterance, language }),
  }).catch(() => null);
  if (!result) return null;
  if (
    !result.intent ||
    !intents.has(result.intent) ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0.8 ||
    result.confidence > 1 ||
    !result.slots ||
    typeof result.slots !== "object" ||
    !Object.values(result.slots).every((value) => typeof value === "string")
  )
    return null;
  if (
    result.intent === "open_section" &&
    !Object.hasOwn(sectionRoutes, result.slots.section ?? "")
  )
    return null;
  if (
    result.intent === "start_game" &&
    result.slots.game &&
    !gameKeysAllowed.has(result.slots.game)
  )
    return null;
  return {
    intent: result.intent,
    slots: result.slots,
    source: result.source,
    confidence: result.confidence,
    requiresConfirm: ["call_person", "sos", "set_reminder"].includes(
      result.intent,
    ),
  };
}
