import { dayInTimezone } from "../db/reminders";
export const reminderTimezone = "Asia/Kolkata";
export interface ReminderDraft {
  title?: string;
  time?: string;
  date?: string;
  recurrence?: "daily";
  ambiguousHour?: string;
}
export type ReminderParse =
  | { kind: "none" }
  | { kind: "invalid"; message: string }
  | { kind: "draft"; draft: ReminderDraft };
export function parseReminderTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12)))
    return null;
  if (match[3]) hour = (hour % 12) + (match[3].toLowerCase() === "pm" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const dayAfter = (day: string, offset: number) =>
  new Date(Date.parse(day + "T00:00:00Z") + offset * 86400000)
    .toISOString()
    .slice(0, 10);
export function parseReminderRequest(
  value: string,
  now = new Date(),
  fragment = false,
): ReminderParse {
  const text = value
    .trim()
    .replace(/\b([ap])\.m\./gi, "$1m")
    .replace(/[.!?]+$/, "");
  if (
    !fragment &&
    !/\bremind me\b|^(?:set|create|add) (?:a )?reminder\b|^don.t let me forget\b/i.test(
      text,
    )
  )
    return { kind: "none" };
  if (
    /\b(?:every (?!day\b)\w+|weekly|monthly|yearly|weekdays|weekends)\b/i.test(
      text,
    )
  )
    return {
      kind: "invalid",
      message:
        "I can set a one-time or daily reminder. Please choose one of those.",
    };
  const draft: ReminderDraft = {};
  const today = dayInTimezone(now);
  if (/\bevery day\b|\bdaily\b/i.test(text)) draft.recurrence = "daily";
  const relative = text.match(/\bin (\d+) (minutes?|hours?)\b/i);
  if (relative) {
    const minutes = Number(relative[1]) * (/hour/i.test(relative[2]!) ? 60 : 1);
    if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 525600)
      return {
        kind: "invalid",
        message:
          "Please choose a reminder between one minute and one year from now.",
      };
    if (/\btomorrow\b|\bevery day\b|\bdaily\b|\bat \d/i.test(text))
      return {
        kind: "invalid",
        message: "Please choose either a relative time or a date and time.",
      };
    const due = new Date(now.getTime() + minutes * 60000);
    draft.date = dayInTimezone(due);
    draft.time = new Intl.DateTimeFormat("en-GB", {
      timeZone: reminderTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(due);
  } else {
    const timeMatch =
      text.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?=\s|$)/i) ??
      (fragment
        ? text.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?=\s|$)/i)
        : null);
    if (timeMatch) {
      let token = timeMatch[1]!.trim();
      if (!/am|pm/i.test(token) && /\bmorning\b/i.test(text)) token += " AM";
      else if (
        !/am|pm/i.test(token) &&
        /\b(?:evening|afternoon|tonight)\b/i.test(text)
      )
        token += " PM";
      const parsed = parseReminderTime(token);
      if (!parsed)
        return {
          kind: "invalid",
          message: "Please give a valid time, such as 8 PM.",
        };
      if (
        !/am|pm/i.test(token) &&
        !/^\d{2}:\d{2}$/.test(token) &&
        Number(token) >= 1 &&
        Number(token) <= 12
      )
        draft.ambiguousHour = token;
      else if (!/am|pm/i.test(token) && /^\d:\d{2}$/.test(token))
        draft.ambiguousHour = token;
      else draft.time = parsed;
    }
    if (/\btomorrow\b/i.test(text)) draft.date = dayAfter(today, 1);
    if (/\btoday\b/i.test(text)) draft.date = today;
    const weekday = weekdays.findIndex((day) =>
      new RegExp(`\\b${day}\\b`, "i").test(text),
    );
    if (weekday >= 0) {
      if (draft.date || draft.recurrence)
        return {
          kind: "invalid",
          message: "Please choose one date or a daily reminder.",
        };
      let offset =
        (weekday - new Date(today + "T00:00:00Z").getUTCDay() + 7) % 7;
      if (
        offset === 0 &&
        (!draft.time ||
          Date.parse(`${today}T${draft.time}:00+05:30`) <= now.getTime())
      )
        offset = 7;
      draft.date = dayAfter(today, offset);
    }
  }
  let task = text
    .replace(/^.*?\bremind me\b\s*(?:(?:to|about)\b)?\s*/i, "")
    .replace(
      /^(?:set|create|add) (?:a )?reminder\s*(?:(?:for|to|about)\b)?\s*/i,
      "",
    )
    .replace(/^don.t let me forget\s*/i, "")
    .replace(/\bin \d+ (?:minutes?|hours?)\b/gi, "")
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, "")
    .replace(
      /\b(?:on|next)?\s*(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
      "",
    )
    .replace(
      /\bevery day\b|\bdaily\b|\btomorrow\b|\btoday\b|\btonight\b|\b(?:in the )?(?:morning|evening|afternoon)\b|\bafter lunch\b/gi,
      "",
    )
    .replace(/^\s*(?:to|about|for)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (fragment)
    task = task.replace(/^\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i, "").trim();
  if (/\b(?:on|next)\b|\b(?:am|pm)\b|\d{4}-\d{2}-\d{2}/i.test(task))
    return {
      kind: "invalid",
      message:
        "I did not understand the date or time. Please say today, tomorrow, or a weekday and a time.",
    };
  if (task) draft.title = task;
  return { kind: "draft", draft };
}
export function completeReminder(draft: ReminderDraft, now = new Date()) {
  if (draft.ambiguousHour)
    return {
      prompt: `Do you mean ${draft.ambiguousHour} AM or ${draft.ambiguousHour} PM?`,
    };
  if (!draft.time) return { prompt: "What time should I remind you?" };
  if (!draft.title) return { prompt: "What should I remind you to do?" };
  const date = draft.date ?? dayInTimezone(now);
  if (
    !draft.recurrence &&
    Date.parse(`${date}T${draft.time}:00+05:30`) <= now.getTime()
  )
    return {
      prompt:
        "That time has already passed. Please choose a future date and time.",
    };
  return {
    slots: {
      title: draft.title.trim(),
      time: draft.time,
      ...(draft.date ? { date } : {}),
      timezone: reminderTimezone,
      ...(draft.recurrence ? { recurrence: draft.recurrence } : {}),
    },
  };
}
