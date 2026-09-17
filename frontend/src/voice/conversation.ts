import { route, type RoutedIntent } from "./router";
import {
  completeReminder,
  parseReminderRequest,
  parseReminderTime,
  type ReminderDraft,
} from "./reminderParser";
import { isNegatedCommand, normalizeTranscript } from "./safety";

/** Ephemeral, reset on assistant close, unmount, language/profile/session change. */
export class VoiceConversation {
  private reminder?: { draft: ReminderDraft; expires: number };
  private games = false;
  reset(): void {
    this.reminder = undefined;
    this.games = false;
  }
  hasPendingReminder(): boolean {
    return Boolean(this.reminder);
  }
  resolve(text: string, now = new Date()): RoutedIntent | string | null {
    text = text
      .trim()
      .replace(/^(?:(?:hey|hi|okay|ok)\s+)?sm[aā]rana[,\s]*/i, "")
      .replace(/[.!?]+$/, "");
    if (isNegatedCommand(text)) return "Okay. I will not do that.";
    if (/^(?:cancel|never mind|cancel (?:the |my )?reminder)$/i.test(text)) {
      this.reset();
      return "Cancelled.";
    }
    const priority = route(text, "en");
    if (priority?.intent === "sos" || priority?.intent === "stop_listening") {
      this.reset();
      return priority;
    }
    if (this.reminder && this.reminder.expires <= now.getTime())
      this.reminder = undefined;
    let parsed = parseReminderRequest(text, now);
    if (parsed.kind === "none" && this.reminder) {
      const old = this.reminder.draft;
      if (old.ambiguousHour && /^(?:am|pm)$/i.test(text))
        parsed = {
          kind: "draft",
          draft: { time: parseReminderTime(`${old.ambiguousHour} ${text}`)! },
        };
      else if (
        /^(?:at )?\d|\btomorrow\b|\btoday\b|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
          text,
        ) ||
        (!old.title &&
          !priority &&
          !/^(?:open|play|start|stop|help|show|call)\b/i.test(text))
      )
        parsed = parseReminderRequest(text, now, true);
      if (parsed.kind === "draft") {
        parsed.draft = { ...old, ...parsed.draft };
        if (parsed.draft.time) delete parsed.draft.ambiguousHour;
      }
    }
    if (parsed.kind === "invalid") {
      this.reminder = undefined;
      return parsed.message;
    }
    if (parsed.kind === "draft") {
      const completed = completeReminder(parsed.draft, now);
      if (completed.prompt) {
        this.reminder = {
          draft: parsed.draft,
          expires: now.getTime() + 300000,
        };
        return completed.prompt;
      }
      this.reminder = undefined;
      return {
        intent: "set_reminder",
        slots: completed.slots!,
        requiresConfirm: true,
      };
    }
    if (priority && priority.intent !== "general_chat")
      this.reminder = undefined;
    if (
      this.games &&
      /\b(?:memory one|memory game)\b/i.test(normalizeTranscript(text)) &&
      priority?.intent === "start_game"
    )
      return priority;
    return null;
  }
  remember(command: RoutedIntent): void {
    this.games =
      command.intent === "start_game" ||
      (command.intent === "open_section" && command.slots.section === "games");
  }
}
