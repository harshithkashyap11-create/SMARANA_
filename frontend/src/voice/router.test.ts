import { describe, expect, it } from "vitest";
import { route } from "./router";
import cases from "../../../shared/intent_cases.json";
describe("voice intent router", () => {
  it("uses a real game route and normalizes reminder times", () => {
    expect(route("play memory match", "en")?.slots.game).toBe("memory_match");
    expect(route("remind me to drink water at 9", "en")?.slots.time).toBe(
      "09:00",
    );
    expect(route("remind me to drink water at 25:00", "en")).toBeNull();
  });
  it.each([
    ["open memories", "open_section"],
    ["show my medicines", "open_section"],
    ["play memory match", "start_game"],
    ["what medicines do I have", "medicines_today"],
    ["what's next", "next_activity"],
    ["read this to me", "read_this"],
    ["speak slowly", "speak_slowly"],
    ["help", "help"],
    ["emergency", "sos"],
    ["জরুরি", "sos"],
    ["ঔষধ", "medicines_today"],
    ["পৰৱৰ্তী", "next_activity"],
  ])("routes %s", (text, intent) =>
    expect(route(text, "en")?.intent).toBe(intent),
  );
  it("fuzzy matches a family member and requires confirmation", () => {
    const result = route("call Priyaa", "en", {
      familyMembers: [{ name: "Priya" }],
    });
    expect(result).toMatchObject({
      intent: "call_person",
      requiresConfirm: true,
      slots: { name: "Priya" },
    });
  });
  it("does not route unknown speech", () =>
    expect(route("purple clouds dancing", "en")).toBeNull());
  it("honours language lock", () =>
    expect(
      route("switch to Bengali language", "en", { languageLocked: true }),
    ).toBeNull());
  it.each(cases)(
    "routes shared case $lang: $utterance",
    ({ lang, utterance, intent }) => {
      expect(route(utterance, lang as "en" | "as" | "bn")?.intent).toBe(intent);
    },
  );
});
