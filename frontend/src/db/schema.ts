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
  phone?: string;
  isEmergencyContact?: boolean;
}

export interface CachedMemory {
  id: string;
  patientId: string;
  title: string;
  occasion: string;
  occurredOn: string | null;
  place: string;
  summary: string;
  people: Array<{ id: string; name: string; relationship: string }>;
  media: Array<{
    id: string;
    kind: string;
    url: string | null;
    caption: string;
  }>;
}

export interface CachedQuizAttempt {
  id: string;
  patientId: string;
  memoryId: string | null;
  questionType: string;
  expected: string;
  given: string;
  correct: boolean;
  attemptedAt: string;
  responseMs: number;
  idempotencyKey: string;
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
export interface CachedGameSession {
  id: string;
  patientId: string;
  gameKey: string;
  seed: string;
  level: number;
  metrics: Record<string, unknown>;
  challengeMode: boolean;
  startedAt: string;
  endedAt: string;
  synced: boolean;
}
export interface CachedDifficultyState {
  id: string;
  patientId: string;
  gameKey: string;
  level: number;
  window: unknown[];
  lockedByDoctor: boolean;
  capLevel: number | null;
  minLevel: number;
  maxLevel: number;
}
export interface CachedDifficultyChange {
  id: string;
  stateId: string;
  sessionId: string;
  fromLevel: number;
  toLevel: number;
  reasonCode: string;
  explanation: string;
}

class SmaranaDatabase extends Dexie {
  meta!: EntityTable<MetaEntry, "key">;
  profile!: EntityTable<CachedPatientProfile, "id">;
  familyMembers!: EntityTable<CachedFamilyMember, "id">;
  routineItems!: EntityTable<CachedRoutineItem, "id">;
  reminders!: EntityTable<CachedReminder, "id">;
  reminderResponses!: EntityTable<CachedReminderResponse, "id">;
  medications!: EntityTable<CachedMedication, "id">;
  memories!: EntityTable<CachedMemory, "id">;
  quizAttempts!: EntityTable<CachedQuizAttempt, "id">;
  gameSessions!: EntityTable<CachedGameSession, "id">;
  difficultyStates!: EntityTable<CachedDifficultyState, "id">;
  difficultyChanges!: EntityTable<CachedDifficultyChange, "id">;

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
    this.version(4).stores({
      meta: "&key",
      profile: "&id, refreshedAt",
      familyMembers: "&id, patientId",
      routineItems: "&id, patientId",
      reminders: "&id, patientId, scheduled_at",
      reminderResponses: "&id, reminderId",
      medications: "&id, patientId",
      memories: "&id, patientId",
      quizAttempts: "&id, patientId, attemptedAt, idempotencyKey",
    });
    this.version(5).stores({
      meta: "&key",
      profile: "&id, refreshedAt",
      familyMembers: "&id, patientId",
      routineItems: "&id, patientId",
      reminders: "&id, patientId, scheduled_at",
      reminderResponses: "&id, reminderId",
      medications: "&id, patientId",
      memories: "&id, patientId",
      quizAttempts: "&id, patientId, attemptedAt, idempotencyKey",
      gameSessions: "&id, patientId, gameKey, synced",
      difficultyStates: "&id, [patientId+gameKey]",
      difficultyChanges: "&id, stateId, sessionId",
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
