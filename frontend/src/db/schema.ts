import Dexie, { type EntityTable } from "dexie";

export interface MetaEntry {
  key: string;
  value: string;
}

export interface CachedPatientProfile {
  id: string;
  name: string;
  orientation: unknown;
  refreshedAt: string;
}

export interface CachedFamilyMember {
  id: string;
  patientId: string;
  name: string;
  relationship: string;
  photoUrl: string | null;
}

export interface CachedRoutineItem {
  id: string;
  patientId: string;
  title: string;
  category: string;
  time_of_day: string;
}
export interface CachedReminder {
  id: string;
  patientId: string;
  title: string;
  category: string;
  note: string;
  scheduled_at: string;
  status: string;
  snoozed_until: string | null;
}
export interface CachedReminderResponse {
  id: string;
  reminderId: string;
  action: string;
  respondedAt: string;
}
export interface CachedMedication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  times: string[];
  instructions: string;
  active: boolean;
}

class SmaranaDatabase extends Dexie {
  meta!: EntityTable<MetaEntry, "key">;
  profile!: EntityTable<CachedPatientProfile, "id">;
  familyMembers!: EntityTable<CachedFamilyMember, "id">;
  routineItems!: EntityTable<CachedRoutineItem, "id">;
  reminders!: EntityTable<CachedReminder, "id">;
  reminderResponses!: EntityTable<CachedReminderResponse, "id">;
  medications!: EntityTable<CachedMedication, "id">;

  constructor() {
    super("smarana");
    this.version(1).stores({ meta: "&key" });
    this.version(2).stores({
      meta: "&key",
      profile: "&id, refreshedAt",
      familyMembers: "&id, patientId",
    });
    this.version(3).stores({
      meta: "&key",
      profile: "&id, refreshedAt",
      familyMembers: "&id, patientId",
      routineItems: "&id, patientId",
      reminders: "&id, patientId, scheduled_at",
      reminderResponses: "&id, reminderId",
      medications: "&id, patientId",
    });
  }
}

export const db = new SmaranaDatabase();

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.meta.get(key))?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}
