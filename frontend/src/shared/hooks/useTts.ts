import { useCalmStore } from "../../features/patient/confused/store";
import { useCallback } from "react";

export function speak(
  text: string,
  options: { rate?: number; language?: string } = {},
): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = useCalmStore.getState().calmMode ? 0.7 : (options.rate ?? 1);
  utterance.lang = options.language ?? document.documentElement.lang;
  window.speechSynthesis.speak(utterance);
}

export function useTts(): (text: string) => void {
  return useCallback((text: string) => speak(text), []);
}
