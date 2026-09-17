import { dayInTimezone } from "../db/reminders";
import { parseReminderTime, type RoutedIntent } from "./router";

/** Ephemeral context belongs to this assistant, not a global patient session. */
export class VoiceConversation {
  private reminder?: { title: string; date?: string; expires: number };
  private games = false;
  resolve(text: string, now = new Date()): RoutedIntent | string | null {
    text = text
      .trim()
      .replace(/^(?:(?:hey|hi|okay|ok)\s+)?sm[aā]rana[,\s]*/i, "")
      .replace(/[.!?]+$/, "")
      .replace(/don't/gi, "don t");
    if (/^(?:cancel|never mind)$/i.test(text.trim())) {
      this.reminder = undefined;
      return "Cancelled.";
    }
    if (this.reminder && this.reminder.expires < now.getTime())
      this.reminder = undefined;
    const time = parseReminderTime(text);
    if (this.reminder && time) {
      const pending = this.reminder;
      this.reminder = undefined;
      return {
        intent: "set_reminder",
        slots: {
          title: pending.title,
          time,
          ...(pending.date ? { date: pending.date } : {}),
        },
        requiresConfirm: true,
      };
    }
    if (this.games && /(?:memory one|memory game)/i.test(text))
      return {
        intent: "start_game",
        slots: { game: "memory_match" },
        requiresConfirm: false,
      };
    const relative = text.match(
      /^remind me in (\d+) (minutes?|hours?) to (.+)$/i,
    );
    if (relative) {
      const minutes =
        Number(relative[1]) * (/hour/i.test(relative[2]!) ? 60 : 1);
      if (minutes < 1 || minutes > 525600)
        return "Please choose a shorter reminder time.";
      const due = new Date(now.getTime() + minutes * 60000);
      const timeOfDay = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(due);
      return {
        intent: "set_reminder",
        slots: {
          title: relative[3]!,
          time: timeOfDay,
          date: dayInTimezone(due),
        },
        requiresConfirm: true,
      };
    }
    const request = text.match(/^(?:remind me to|don t let me forget) (.+)$/i);
    if (request) {
      const tomorrow = /\btomorrow\b/i.test(request[1]!);
      const content = request[1]!.replace(/\btomorrow\b/i, "").trim();
      const at = content.match(/^(.+?) at (.+)$/i);
      const date = tomorrow
        ? dayInTimezone(new Date(now.getTime() + 86400000))
        : undefined;
      if (at) {
        const parsed = parseReminderTime(at[2]!);
        if (!parsed) return "Please give a valid time, such as 8 PM.";
        return {
          intent: "set_reminder",
          slots: { title: at[1]!, time: parsed, ...(date ? { date } : {}) },
          requiresConfirm: true,
        };
      }
      this.reminder = { title: content, date, expires: now.getTime() + 300000 };
      return "What time should I remind you?";
    }
    return null;
  }
  remember(command: RoutedIntent): void {
    this.games =
      command.intent === "start_game" ||
      (command.intent === "open_section" && command.slots.section === "games");
  }
}
