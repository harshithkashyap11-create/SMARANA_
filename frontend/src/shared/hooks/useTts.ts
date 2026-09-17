import { useCalmStore } from "../../features/patient/confused/store";
import { useCallback } from "react";

export function cancelSpeech(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* Optional engine failure must not interrupt navigation or unmount. */
  }
}

export function speak(
  text: string,
  options: { rate?: number; language?: string } = {},
): void {
  if (
    !text.trim() ||
    !window.speechSynthesis ||
    !window.SpeechSynthesisUtterance
  )
    return;
  try {
    cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = useCalmStore.getState().calmMode
      ? 0.7
      : (options.rate ?? 1);
    utterance.lang = options.language ?? document.documentElement.lang;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* Optional audio must never break navigation or a game. */
  }
}

export function useTts(): (text: string) => void {
  return useCallback((text: string) => speak(text), []);
}
