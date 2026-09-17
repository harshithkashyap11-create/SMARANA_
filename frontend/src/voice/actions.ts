import { i18n } from "../shared/i18n";
import { dayInTimezone } from "../db/reminders";
import type { NavigateFunction } from "react-router-dom";
import { db } from "../db/schema";
import { createOutboxEntry } from "../db/outbox";
import type { RoutineRepository } from "../db/repo/routine";
import type { RoutedIntent } from "./router";
import type { TextToSpeech } from "./tts";
import { gameKeysAllowed, sectionRoutes } from "./registry";
export interface ActionContext {
  navigate: NavigateFunction;
  tts: TextToSpeech;
  routine: RoutineRepository;
  patientId: string;
  confirm: (message: string, action: () => void | Promise<void>) => void;
  mainText?: string;
  nextActivity?: () => Promise<string>;
  callPerson?: (name: string) => void;
  openSos?: () => void;
  setSlowSpeech?: (slow: boolean) => Promise<void>;
}
export async function performAction(
  command: RoutedIntent,
  context: ActionContext,
): Promise<void> {
  if (command.intent === "switch_language") {
    const { i18n } = await import("../shared/i18n");
    const { getMeta } = await import("../db/schema");
    if (
      (await getMeta("languageLocked")) !== "1" &&
      ["en", "as", "bn", "hi", "te", "mni", "lus"].includes(
        command.slots.language ?? "",
      )
    )
      await i18n.changeLanguage(command.slots.language);
    return;
  }
  if (command.intent === "open_section") {
    const section = command.slots.section ?? "";
    const target = Object.hasOwn(sectionRoutes, section)
      ? sectionRoutes[section]
      : undefined;
    if (!target) throw new Error("Unsupported section");
    void context.navigate(target);
    await context.tts.speak(`Opening ${command.slots.section}.`);
    return;
  }
  if (command.intent === "start_game") {
    if (command.slots.game && !gameKeysAllowed.has(command.slots.game))
      throw new Error("Unsupported game");
    void context.navigate(
      command.slots.game
        ? `/patient/games/${command.slots.game}`
        : "/patient/games",
    );
    await context.tts.speak(
      command.slots.game ? "Starting your game." : "Opening your games.",
    );
    return;
  }
  if (command.intent === "stop_game") {
    void context.navigate("/patient/games");
    await context.tts.speak("Leaving the game.");
    return;
  }
  if (command.intent === "time_query" || command.intent === "date_query") {
    await context.tts.speak(
      command.intent === "time_query"
        ? new Date().toLocaleTimeString()
        : new Date().toLocaleDateString(),
    );
    return;
  }
  if (command.intent === "general_chat") {
    await context.tts.speak(
      command.slots.response ?? "Please try another request.",
    );
    return;
  }
  if (command.intent === "medicines_today") {
    const meds = await context.routine.getMedications();
    await context.tts.speak(
      meds.length
        ? i18n.t("voice.medicines", {
            medicines: meds.map((x) => `${x.name}, ${x.dose}`).join(". "),
          })
        : i18n.t("voice.noMedicines"),
    );
    return;
  }
  if (command.intent === "read_this") {
    await context.tts.speak(context.mainText ?? "");
    return;
  }
  if (command.intent === "next_activity") {
    await context.tts.speak(
      (await context.nextActivity?.()) ?? i18n.t("voice.homeTogether"),
    );
    return;
  }
  if (
    command.intent === "speak_slowly" ||
    command.intent === "speak_normally"
  ) {
    const slow = command.intent === "speak_slowly";
    await context.setSlowSpeech?.(slow);
    await context.tts.speak(
      slow ? i18n.t("voice.slower") : i18n.t("voice.normal"),
    );
    return;
  }
  if (command.intent === "help") {
    void context.navigate("/patient");
    await context.tts.speak(
      "You can ask me to open games, show reminders, read this page, or tell you the time. Say stop listening to finish.",
    );
    return;
  }
  if (command.intent === "call_person") {
    const name = command.slots.name ?? i18n.t("voice.familyMember");
    const message = i18n.t("voice.call", { name });
    await context.tts.speak(message);
    context.confirm(message, () => context.callPerson?.(name));
    return;
  }
  if (command.intent === "sos") {
    const message = i18n.t("voice.emergency");
    await context.tts.speak(message);
    context.confirm(message, () => context.openSos?.());
    return;
  }
  if (command.intent === "set_reminder") {
    if (
      !command.slots.title?.trim() ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(command.slots.time ?? "")
    )
      throw new Error("Invalid reminder");
    const id = crypto.randomUUID();
    const day = command.slots.date ?? dayInTimezone();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      Number.isNaN(Date.parse(day)) ||
      new Date(day).toISOString().slice(0, 10) !== day
    )
      throw new Error("Invalid reminder date");
    const payload = {
      id,
      patient_id: context.patientId,
      title: command.slots.title,
      time_of_day: command.slots.time,
      start_date: day,
      end_date: day,
      category: "custom",
      days_of_week: [(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7],
      source: "patient",
      device_updated_at: new Date().toISOString(),
    };
    const message = i18n.t("voice.reminder", { title: command.slots.title });
    await context.tts.speak(message);
    context.confirm(message, async () => {
      await db.transaction("rw", db.routineItems, db.outbox, async () => {
        await db.routineItems.put({
          id,
          patientId: context.patientId,
          title: command.slots.title ?? "Reminder",
          category: "custom",
          time_of_day: command.slots.time ?? "09:00",
          days_of_week: [(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7],
          start_date: day,
          end_date: day,
        });
        await db.outbox.put(
          createOutboxEntry("routine_item", id, context.patientId, payload),
        );
      });
      await context.tts.speak("Your reminder is saved.");
    });
  }
}
