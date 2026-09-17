import { afterEach, expect, it, vi } from "vitest";
import { VoiceConversation } from "./conversation";
import { VoiceLoop } from "./loop";
import { FakeSpeechToText } from "./stt";
import { route, parseReminderTime } from "./router";
afterEach(() => vi.useRealTimers());

it.each([
  ["Hey Smarana, open my games.", "open_section", "games"],
  ["Take me to the patient dashboard", "open_section", "home"],
  ["Show my progress", "open_section", "progress"],
  ["Open the memory game", "start_game", "memory_match"],
  ["Can we play something?", "start_game", undefined],
  ["Stop listening", "stop_listening", undefined],
])("routes %s locally", (text, intent, target) => {
  const command = route(text, "en");
  expect(command?.intent).toBe(intent);
  expect(command?.slots.section ?? command?.slots.game).toBe(target);
});
it("parses AM/PM without silently changing invalid times", () => {
  expect(parseReminderTime("8 PM")).toBe("20:00");
  expect(parseReminderTime("12 AM")).toBe("00:00");
  expect(parseReminderTime("13 PM")).toBeNull();
  expect(route("remind me to drink water at 8 PM", "en")?.slots.time).toBe(
    "20:00",
  );
});
it("keeps reminder and game context", () => {
  const context = new VoiceConversation();
  expect(context.resolve("Remind me to take medicine")).toContain("What time");
  expect(context.resolve("8 PM")).toMatchObject({
    intent: "set_reminder",
    slots: { title: "take medicine", time: "20:00" },
  });
  context.remember(route("open games", "en")!);
  expect(context.resolve("Start the memory one")).toMatchObject({
    slots: { game: "memory_match" },
  });
});
it("uses application timezone for relative reminders and expires pending context", () => {
  const context = new VoiceConversation();
  const now = new Date("2026-09-17T18:20:00Z");
  expect(
    context.resolve("Remind me in 20 minutes to drink water", now),
  ).toMatchObject({ slots: { time: "00:10", date: "2026-09-18" } });
  context.resolve("Remind me to drink water", now);
  expect(context.resolve("8 PM", new Date(now.getTime() + 301000))).toBeNull();
});
it("pauses STT throughout processing/speech and resumes until stopped", async () => {
  vi.useFakeTimers();
  const stt = new FakeSpeechToText();
  let finish!: () => void;
  const handler = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const loop = new VoiceLoop(stt, handler, vi.fn(), vi.fn());
  loop.start();
  stt.emit("open games");
  expect(stt.active).toBe(false);
  await vi.advanceTimersByTimeAsync(1000);
  expect(stt.active).toBe(false);
  finish();
  await vi.advanceTimersByTimeAsync(1000);
  expect(stt.active).toBe(true);
  stt.emit("stop listening");
  await vi.advanceTimersByTimeAsync(2000);
  expect(stt.active).toBe(false);
  expect(handler).toHaveBeenCalledTimes(1);
});
it("recovers from handler/TTS errors without duplicate turns", async () => {
  vi.useFakeTimers();
  const stt = new FakeSpeechToText();
  const error = vi.fn();
  const loop = new VoiceLoop(
    stt,
    () => Promise.reject(new Error("TTS failed")),
    vi.fn(),
    error,
  );
  loop.start();
  stt.emit("hello");
  await vi.advanceTimersByTimeAsync(1000);
  expect(error).toHaveBeenCalledWith("processing-failed");
  expect(stt.active).toBe(true);
  loop.stop();
});
