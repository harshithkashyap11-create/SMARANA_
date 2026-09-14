import { useCallback } from "react";

export function speak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export function useTts(): (text: string) => void {
  return useCallback((text: string) => speak(text), []);
}
