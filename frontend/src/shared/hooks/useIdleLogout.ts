import { useEffect } from "react";

import { useAuthStore } from "../../features/auth/authStore";

const PROFESSIONAL_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export function useIdleLogout(timeoutMs = PROFESSIONAL_IDLE_TIMEOUT_MS): void {
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    let timeoutId: number;

    const restartTimer = (): void => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void logout();
      }, timeoutMs);
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
  }, [logout, timeoutMs]);
}
