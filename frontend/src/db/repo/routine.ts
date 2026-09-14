import { apiClient } from "../../api/client";
import {
  db,
  type CachedMedication,
  type CachedReminder,
  type CachedReminderResponse,
} from "../schema";

export type ReminderAction = "taken" | "later" | "skipped" | "help";
export type Reminder = Omit<CachedReminder, "patientId">;
export type Medication = Omit<CachedMedication, "patientId">;

interface PatientList {
  results: Array<{ id: string }>;
}

export interface RoutineRepository {
  getToday(): Promise<Reminder[]>;
  getMedications(): Promise<Medication[]>;
  respond(reminderId: string, action: ReminderAction): Promise<void>;
}

async function patientId(): Promise<string> {
  const patients = await apiClient<PatientList>("/api/v1/patients/", {
    method: "GET",
  });
  if (!patients.results[0]) throw new Error("Patient profile is unavailable");
  return patients.results[0].id;
}

export class DexieRoutineRepository implements RoutineRepository {
  async getToday(): Promise<Reminder[]> {
    const id = await patientId();
    const date = new Date().toISOString().slice(0, 10);
    const items = await apiClient<Reminder[]>(
      `/api/v1/patients/${id}/reminders/?date=${date}`,
      { method: "GET" },
    );
    await db.reminders.bulkPut(
      items.map((item) => ({ ...item, patientId: id })),
    );
    return items;
  }

  async getMedications(): Promise<Medication[]> {
    const id = await patientId();
    const items = await apiClient<Medication[]>(
      `/api/v1/patients/${id}/medications/`,
      { method: "GET" },
    );
    await db.medications.bulkPut(
      items.map((item) => ({ ...item, patientId: id })),
    );
    return items;
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
    await db.transaction("rw", db.reminders, db.reminderResponses, async () => {
      await db.reminderResponses.put(local);
      await db.reminders.update(reminderId, {
        status: action,
        snoozed_until:
          action === "later"
            ? new Date(Date.now() + 15 * 60_000).toISOString()
            : null,
      });
    });
    await apiClient(`/api/v1/patients/${id}/reminders/${reminderId}/respond/`, {
      method: "POST",
      body: JSON.stringify({
        action,
        responded_at: respondedAt,
        idempotency_key: responseId,
      }),
    });
  }
}

export const routineRepository = new DexieRoutineRepository();
