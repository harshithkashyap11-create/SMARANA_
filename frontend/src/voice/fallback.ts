import { apiClient } from "../api/client";
import type { RoutedIntent } from "./router";
import type { VoiceLanguage } from "./stt";
/** A model may return conversational text only, never an application command. */
export async function routeWithFallback(
  utterance: string,
  language: VoiceLanguage,
  signal?: AbortSignal,
): Promise<RoutedIntent | null> {
  if (import.meta.env.VITE_VOICE_LLM_FALLBACK !== "1" || signal?.aborted)
    return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15_000);
  try {
    const result = await apiClient<{
      intent: string | null;
      slots: Record<string, string>;
      confidence: number;
      source?: "LOCAL_LLM" | "CLOUD_LLM";
    }>("/api/v1/voice/route/", {
      method: "POST",
      signal: controller.signal,
      body: JSON.stringify({ utterance, language }),
    });
    if (
      signal?.aborted ||
      controller.signal.aborted ||
      !result ||
      result.intent !== "general_chat" ||
      !Number.isFinite(result.confidence) ||
      result.confidence < 0.8 ||
      result.confidence > 1 ||
      !result.slots ||
      typeof result.slots.response !== "string" ||
      !result.slots.response.trim() ||
      result.slots.response.length > 600 ||
      !["LOCAL_LLM", "CLOUD_LLM"].includes(result.source ?? "")
    )
      return null;
    return {
      intent: "general_chat",
      slots: { response: result.slots.response.trim() },
      source: result.source,
      confidence: result.confidence,
      requiresConfirm: false,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
