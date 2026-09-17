import { expect, it } from "vitest";
import cases from "../../../shared/voice_audit_cases.json";
import { voiceGames, recognizeGame } from "./gameContract";
import { gameCatalog } from "../games/registry";
import { route } from "./router";
import { VoiceConversation } from "./conversation";
const now = new Date("2026-09-17T10:00:00Z");
it.each(cases)("audit matrix: $text -> $intent", (row) => {
  const context = new VoiceConversation();
  const contextual = context.resolve(row.text, now);
  const detected: { intent: string; slots: Record<string, string> } =
    typeof contextual === "string"
      ? {
          intent: context.hasPendingReminder()
            ? "set_reminder_followup"
            : "clarification",
          slots: { response: contextual },
        }
      : (contextual ??
        route(row.text, "en") ?? { intent: "unknown", slots: {} });
  expect(detected.intent).toBe(row.intent);
  for (const [key, value] of Object.entries(row.entities))
    expect(detected.slots[key]?.trim()).toBe(value);
});
it("shares exactly the enabled UI game keys, names and routes", () => {
  expect(gameCatalog.map((game) => game.key).sort()).toEqual(
    voiceGames.map((game) => game.id).sort(),
  );
  for (const game of gameCatalog)
    expect(voiceGames.find((item) => item.id === game.key)).toMatchObject({
      displayName: game.name,
      route: game.route,
    });
});
for (const game of voiceGames) {
  it.each([
    "Play",
    "Start",
    "Let's play",
    "Open",
    "I want to play",
    "Can we play",
  ])(`recognizes ${game.displayName} with %s`, (prefix) => {
    expect(route(prefix + " " + game.displayName + "!", "en")).toMatchObject({
      intent: "start_game",
      slots: { game: game.id },
    });
  });
  it.each(game.voiceAliases)(`alias for ${game.id}: %s`, (alias) => {
    expect(route("Play " + alias.toUpperCase(), "en")?.slots.game).toBe(
      game.id,
    );
  });
}
it.each([
  "help emergency",
  "help me, this is an emergency",
  "I need emergency help",
])("emergency wins: %s", (text) => {
  expect(route(text, "en")).toMatchObject({
    intent: "sos",
    requiresConfirm: true,
  });
});
it.each([
  "Do not open games",
  "Don't start sequence recall",
  "I don't want to play memory match",
  "Don't create a reminder",
])("denied action does not execute: %s", (text) => {
  expect(route(text, "en")?.intent).toBe("cancel");
});
it("negation of memory is not negation of navigation", () =>
  expect(route("I don't remember my schedule", "en")).toMatchObject({
    intent: "open_section",
    slots: { section: "routine" },
  }));
it.each(["Play Dragon Chess", "Play banana rocket", "Start unknown game"])(
  "unknown games are not launched: %s",
  (text) => expect(route(text, "en")).toBeNull(),
);
it("longest alias protects personal memory and rejects multiple games", () => {
  expect(recognizeGame("Play personal memory game")?.id).toBe(
    "personal_memory",
  );
  expect(
    recognizeGame("Play Sequence Recall and Memory Match"),
  ).toBeUndefined();
});
