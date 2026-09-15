import type { NavigateFunction } from "react-router-dom";
import { db } from "../db/schema";
import { createOutboxEntry } from "../db/outbox";
import type { RoutineRepository } from "../db/repo/routine";
import type { RoutedIntent } from "./router";
import type { TextToSpeech } from "./tts";
export interface ActionContext { navigate: NavigateFunction; tts: TextToSpeech; routine: RoutineRepository; patientId: string; confirm: (message: string, action: () => void) => void; mainText?: string; }
export async function performAction(command: RoutedIntent, context: ActionContext): Promise<void> {
  if (command.intent === "open_section") { context.navigate(`/patient/${command.slots.section}`); return; }
  if (command.intent === "start_game") { context.navigate(command.slots.game ? `/patient/games/${command.slots.game}` : "/patient/games"); return; }
  if (command.intent === "medicines_today") { const meds = await context.routine.getMedications(); await context.tts.speak(meds.length ? `Today you have ${meds.map((x) => `${x.name}, ${x.dose}`).join(". ")}.` : "There are no medicines listed for today."); return; }
  if (command.intent === "read_this") { await context.tts.speak(context.mainText ?? ""); return; }
  if (command.intent === "set_reminder") { const id = crypto.randomUUID(); const day = new Date().toISOString().slice(0, 10); const payload = { id, patient_id: context.patientId, title: command.slots.title, time_of_day: command.slots.time, start_date: day, source: "patient", device_updated_at: new Date().toISOString() }; context.confirm(`Set a reminder for ${command.slots.title}?`, () => { void db.transaction("rw", db.routineItems, db.outbox, async () => { await db.routineItems.put({ id, patientId: context.patientId, title: command.slots.title ?? "Reminder", category: "custom", time_of_day: command.slots.time ?? "09:00" }); await db.outbox.put(createOutboxEntry("routine_item", id, context.patientId, payload)); }); }); }
}
