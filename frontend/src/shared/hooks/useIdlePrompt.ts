import { useCallback, useEffect, useState } from "react";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export function useIdlePrompt(timeoutMs: number) {
  const [isPromptOpen, setPromptOpen] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  const confirmPresence = useCallback(() => {
    setPromptOpen(false);
    setResetCount((value) => value + 1);
  }, []);

  useEffect(() => {
    let timeoutId: number;

    const restartTimer = (): void => {
      if (isPromptOpen) return;
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setPromptOpen(true), timeoutMs);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, restartTimer, { passive: true });
    }
    restartTimer();

    return () => {
      window.clearTimeout(timeoutId);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, restartTimer);
      }
    };
  }, [isPromptOpen, resetCount, timeoutMs]);

  return { confirmPresence, isPromptOpen };
}
