import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { apiClient } from "../api/client";
import { routeWithFallback } from "./fallback";
vi.mock("../api/client", () => ({ apiClient: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_VOICE_LLM_FALLBACK", "1");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it.each([
  "sos",
  "set_reminder",
  "open_section",
  "start_game",
  "medicines_today",
  "stop_game",
])("models cannot execute %s", async (intent) => {
  vi.mocked(apiClient).mockResolvedValue({
    intent,
    slots: {
      section: "home",
      game: "memory_match",
      title: "water",
      time: "20:00",
    },
    confidence: 0.99,
    source: "LOCAL_LLM",
  });
  expect(await routeWithFallback("test", "en")).toBeNull();
});
it("accepts bounded chat and propagates cancellation to HTTP", async () => {
  vi.mocked(apiClient).mockResolvedValue({
    intent: "general_chat",
    slots: { response: "Memory helps us remember." },
    confidence: 0.9,
    source: "LOCAL_LLM",
  });
  expect(await routeWithFallback("What is memory?", "en")).toMatchObject({
    intent: "general_chat",
    requiresConfirm: false,
  });
  const controller = new AbortController();
  let signal: AbortSignal | undefined;
  vi.mocked(apiClient).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        signal = options?.signal ?? undefined;
        signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  );
  const pending = routeWithFallback("What is memory?", "en", controller.signal);
  controller.abort();
  expect(await pending).toBeNull();
  expect(signal?.aborted).toBe(true);
});
it("times out pending HTTP requests", async () => {
  vi.useFakeTimers();
  vi.mocked(apiClient).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  );
  const pending = routeWithFallback("What is memory?", "en");
  await vi.advanceTimersByTimeAsync(15000);
  expect(await pending).toBeNull();
});
it.each([
  null,
  { intent: "general_chat", slots: { response: "" }, confidence: 0.9 },
  {
    intent: "general_chat",
    slots: { response: "x".repeat(601) },
    confidence: 0.9,
    source: "LOCAL_LLM",
  },
])("rejects malformed/unbounded output", async (reply) => {
  vi.mocked(apiClient).mockResolvedValue(reply);
  expect(await routeWithFallback("test", "en")).toBeNull();
});
