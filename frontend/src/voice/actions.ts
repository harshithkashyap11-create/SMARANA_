import { i18n } from "../shared/i18n";
import { dayInTimezone } from "../db/reminders";
import type { NavigateFunction } from "react-router-dom";
import { db } from "../db/schema";
import { createOutboxEntry } from "../db/outbox";
import type { RoutineRepository } from "../db/repo/routine";
import type { RoutedIntent } from "./router";
import type { TextToSpeech } from "./tts";
export interface ActionContext {
  navigate: NavigateFunction;
  tts: TextToSpeech;
  routine: RoutineRepository;
  patientId: string;
  confirm: (message: string, action: () => void) => void;
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
      ["en", "as", "bn"].includes(command.slots.language ?? "")
    )
      await i18n.changeLanguage(command.slots.language);
    return;
  }
  if (command.intent === "open_section") {
    void context.navigate(`/patient/${command.slots.section}`);
    return;
  }
  if (command.intent === "start_game") {
    void context.navigate(
      command.slots.game
        ? `/patient/games/${command.slots.game}`
        : "/patient/games",
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
    const id = crypto.randomUUID();
    const day = dayInTimezone();
    const payload = {
      id,
      patient_id: context.patientId,
      title: command.slots.title,
      time_of_day: command.slots.time,
      start_date: day,
      source: "patient",
      device_updated_at: new Date().toISOString(),
    };
    const message = i18n.t("voice.reminder", { title: command.slots.title });
    await context.tts.speak(message);
    context.confirm(message, () => {
      void db.transaction("rw", db.routineItems, db.outbox, async () => {
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
    });
  }
}
