import { dayInTimezone, generateLocalReminders } from "../reminders";
import { apiClient } from "../../api/client";
import {
  activeProfile,
  db,
  type CachedMedication,
  type CachedReminder,
  type CachedReminderResponse,
} from "../schema";
import { createOutboxEntry, isFakeOffline } from "../outbox";

export type ReminderAction = "taken" | "later" | "skipped" | "help";
export type Reminder = Omit<CachedReminder, "patientId">;
export type Medication = Omit<CachedMedication, "patientId">;

interface PatientList {
  results: Array<{ id: string }>;
}

export interface RoutineRepository {
  getToday(this: void, signal?: AbortSignal): Promise<Reminder[]>;
  getMedications(this: void, signal?: AbortSignal): Promise<Medication[]>;
  respond(reminderId: string, action: ReminderAction): Promise<void>;
}

async function patientId(): Promise<string> {
  const cached = await activeProfile();
  if (cached) return cached.id;
  const patients = await apiClient<PatientList>("/api/v1/patients/", {
    method: "GET",
  });
  if (!patients.results[0]) throw new Error("Patient profile is unavailable");
  return patients.results[0].id;
}

export class DexieRoutineRepository implements RoutineRepository {
  async getToday(signal?: AbortSignal): Promise<Reminder[]> {
    signal?.throwIfAborted();
    const id = await patientId();
    signal?.throwIfAborted();
    const date = dayInTimezone();
    await generateLocalReminders(id, date);
    const cached = await db.reminders
      .where("patientId")
      .equals(id)
      .filter((item) => dayInTimezone(new Date(item.scheduled_at)) === date)
      .toArray();
    if (isFakeOffline() || !navigator.onLine) return cached;
    try {
      const items = await apiClient<Reminder[]>(
        `/api/v1/patients/${id}/reminders/?date=${date}`,
        { method: "GET", signal },
      );
      signal?.throwIfAborted();
      const pending = new Set(
        (
          await db.outbox.where("model").equals("reminder_response").toArray()
        ).map((item) => item.payload.reminder_id),
      );
      const merged = items.map((item) =>
        pending.has(item.id)
          ? (cached.find((row) => row.id === item.id) ?? {
              ...item,
              patientId: id,
            })
          : { ...item, patientId: id },
      );
      await db.reminders.bulkPut(merged);
      return merged;
    } catch (error) {
      signal?.throwIfAborted();
      if (cached.length) return cached;
      throw error;
    }
  }

  async getMedications(signal?: AbortSignal): Promise<Medication[]> {
    signal?.throwIfAborted();
    const id = await patientId();
    signal?.throwIfAborted();
    const cached = await db.medications.where("patientId").equals(id).toArray();
    if (isFakeOffline() || !navigator.onLine) return cached;
    try {
      const items = await apiClient<Medication[]>(
        `/api/v1/patients/${id}/medications/`,
        { method: "GET", signal },
      );
      signal?.throwIfAborted();
      await db.medications.bulkPut(
        items.map((item) => ({ ...item, patientId: id })),
      );
      return items;
    } catch (error) {
      signal?.throwIfAborted();
      if (cached.length) return cached;
      throw error;
    }
  }

  async respond(reminderId: string, action: ReminderAction): Promise<void> {
    const id = await patientId();
    const respondedAt = new Date().toISOString();
    const responseId = crypto.randomUUID();
    const local: CachedReminderResponse = {
      id: responseId,
      reminderId,
      action,
      respondedAt,
    };
    const reminder = await db.reminders.get(reminderId);
    if (!reminder || reminder.patientId !== id)
      throw new Error("Reminder unavailable");
    const payload = {
      scheduled_at: reminder.scheduled_at,
      id: responseId,
      patient_id: id,
      reminder_id: reminderId,
      action,
      responded_at: respondedAt,
      device_updated_at: respondedAt,
    };
    await db.transaction(
      "rw",
      db.reminders,
      db.reminderResponses,
      db.outbox,
      async () => {
        await db.reminderResponses.put(local);
        await db.reminders.update(reminderId, {
          status: action,
          snoozed_until:
            action === "later"
              ? new Date(Date.now() + 15 * 60_000).toISOString()
              : null,
        });
        await db.outbox.put(
          createOutboxEntry("reminder_response", responseId, id, payload),
        );
      },
    );
  }
}

export const routineRepository = new DexieRoutineRepository();
