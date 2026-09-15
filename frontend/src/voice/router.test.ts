import { describe, expect, it } from "vitest";
import { route } from "./router";
describe("voice intent router", () => {
  it.each([
    ["open memories", "open_section"], ["show my medicines", "open_section"], ["play memory match", "start_game"], ["what medicines do I have", "medicines_today"], ["what's next", "next_activity"], ["read this to me", "read_this"], ["speak slowly", "speak_slowly"], ["help", "help"], ["emergency", "sos"], ["জরুরি", "sos"], ["ঔষধ", "medicines_today"], ["পৰৱৰ্তী", "next_activity"],
  ])("routes %s", (text, intent) => expect(route(text, "en")?.intent).toBe(intent));
  it("fuzzy matches a family member and requires confirmation", () => { const result = route("call Priyaa", "en", { familyMembers: [{ name: "Priya" }] }); expect(result).toMatchObject({ intent: "call_person", requiresConfirm: true, slots: { name: "Priya" } }); });
  it("does not route unknown speech", () => expect(route("purple clouds dancing", "en")).toBeNull());
  it("honours language lock", () => expect(route("switch to Bengali language", "en", { languageLocked: true })).toBeNull());
});
