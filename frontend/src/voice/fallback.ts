import { apiClient } from "../api/client";
import type { RoutedIntent } from "./router";
import type { VoiceLanguage } from "./stt";
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
  }>("/api/v1/voice/route/", {
    method: "POST",
    body: JSON.stringify({ utterance, language }),
  }).catch(() => null);
  if (!result) return null;
  if (!result.intent || result.confidence < 0.7) return null;
  return {
    intent: result.intent,
    slots: result.slots,
    requiresConfirm: ["call_person", "sos", "set_reminder"].includes(
      result.intent,
    ),
  };
}
