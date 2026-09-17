import { expect, it } from "vitest";
import { VoiceConversation } from "./conversation";
import { parseReminderTime } from "./reminderParser";
const now = new Date("2026-09-17T10:00:00Z");
it.each([
  ["12 AM", "00:00"],
  ["12 PM", "12:00"],
  ["8 PM", "20:00"],
  ["23:59", "23:59"],
  ["13 PM", null],
  ["24:00", null],
  ["8:99", null],
])("time %s -> %s", (input, expected) =>
  expect(parseReminderTime(input)).toBe(expected),
);
it.each([
  ["Remind me to drink water at 8 PM", { title: "drink water", time: "20:00" }],
  [
    "Remind me tomorrow at 9 AM to drink water",
    { title: "drink water", time: "09:00", date: "2026-09-18" },
  ],
  [
    "Remind me on Friday at 6 PM to drink water",
    { title: "drink water", time: "18:00", date: "2026-09-18" },
  ],
  [
    "Remind me every day at 8 PM to take medicine",
    { title: "take medicine", time: "20:00", recurrence: "daily" },
  ],
  [
    "Remind me in 20 minutes to drink water",
    { title: "drink water", time: "15:50", date: "2026-09-17" },
  ],
])("extracts complete reminder: %s", (text, slots) =>
  expect(new VoiceConversation().resolve(text, now)).toMatchObject({
    intent: "set_reminder",
    slots,
  }),
);
it("asks AM/PM without guessing, and accepts PM follow-up", () => {
  const context = new VoiceConversation();
  expect(context.resolve("Remind me to drink water at 8", now)).toBe(
    "Do you mean 8 AM or 8 PM?",
  );
  expect(context.resolve("PM", now)).toMatchObject({
    slots: { title: "drink water", time: "20:00" },
  });
});
it("requires missing task and supports time-only/relative drafts", () => {
  const context = new VoiceConversation();
  expect(context.resolve("Remind me at 8 PM", now)).toContain("What should");
  expect(context.resolve("drink water", now)).toMatchObject({
    slots: { title: "drink water", time: "20:00" },
  });
  expect(
    new VoiceConversation().resolve("Remind me in 20 minutes", now),
  ).toContain("What should");
});
it("handles natural follow-up dates and clears context on cancel/reset", () => {
  const context = new VoiceConversation();
  context.resolve("Remind me to drink water", now);
  expect(context.resolve("tomorrow at 8 PM", now)).toMatchObject({
    slots: { title: "drink water", time: "20:00", date: "2026-09-18" },
  });
  context.resolve("Remind me to drink water", now);
  context.resolve("cancel", now);
  expect(context.resolve("8 PM", now)).toBeNull();
  context.resolve("Remind me to drink water", now);
  context.reset();
  expect(context.hasPendingReminder()).toBe(false);
});
it("weekday means next valid occurrence, including same-day past times", () => {
  expect(
    new VoiceConversation().resolve(
      "Remind me on Thursday at 9 AM to drink water",
      now,
    ),
  ).toMatchObject({ slots: { date: "2026-09-24" } });
  expect(
    new VoiceConversation().resolve(
      "Remind me on Thursday at 8 PM to drink water",
      now,
    ),
  ).toMatchObject({ slots: { date: "2026-09-17" } });
});
it.each([
  "Remind me every week at 8 PM to drink water",
  "Remind me monthly at 8 PM to drink water",
])("does not downgrade unsupported recurrence: %s", (text) => {
  const result = new VoiceConversation().resolve(text, now);
  expect(typeof result).toBe("string");
  expect(result).toContain("one-time or daily");
});
it("does not silently schedule in the past", () =>
  expect(
    new VoiceConversation().resolve(
      "Remind me to drink water today at 8 AM",
      now,
    ),
  ).toContain("already passed"));
it("rejects conflicting date and relative instructions", () =>
  expect(
    new VoiceConversation().resolve(
      "Remind me in 20 minutes tomorrow to drink water",
      now,
    ),
  ).toContain("either"));
