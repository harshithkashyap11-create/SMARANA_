import { apiClient } from "../../api/client";

export type PatientCard = {
  id: string;
  name: string;
  is_primary: boolean;
  last_active_at: string | null;
  pending_on_device: boolean;
};
export type PatientProfile = {
  region: string;
  cultural_notes: string;
  language: string;
};

export type RoutineItem = {
  id: string;
  title: string;
  category: string;
  time_of_day: string;
  days_of_week: number[];
  start_date: string;
  end_date: string | null;
  icon: string;
  note: string;
  source: "caregiver" | "doctor" | "system";
  set_by: string | null;
};

export type RoutinePayload = Omit<RoutineItem, "id" | "source" | "set_by">;

export type Adherence = {
  days: Array<{
    date: string;
    reminders: Array<{
      id: string;
      title: string;
      category: string;
      scheduled_at: string;
      status: string;
      responded_at: string | null;
    }>;
  }>;
  summary: Record<string, number>;
};
export type FamilyMember = { id: string; name: string; relationship: string };
export type MemoryRecord = { id: string; title: string };
export type CareAlert = {
  id: string;
  rule_key: string;
  severity: "info" | "attention" | "high";
  title: string;
  explanation: string;
  evidence: Record<string, unknown>;
  triggered_at: string;
  status: "open" | "acknowledged" | "forwarded" | "dismissed";
  notes: string;
  can_forward: boolean;
};
export type GameSessionRow = {
  id: string;
  game_key: string;
  game_name: string;
  level: number;
  metrics: {
    accuracy?: number;
    mean_reaction_ms?: number;
    completed?: boolean;
  };
  started_at: string;
  ended_at: string;
};
export type DifficultyChangeRow = {
  id: string;
  game_name: string;
  from_level: number;
  to_level: number;
  reason_code: string;
  explanation: string;
  created_at: string;
};
export type CareNote = {
  id: string;
  author_name: string;
  category: string;
  visibility: string;
  text: string;
  created_at: string;
};

const base = "/api/v1/patients";
export const caregiverApi = {
  patients: async (): Promise<PatientCard[]> => {
    const patients: PatientCard[] = [];
    let path: string | null = `${base}/`;
    while (path) {
      const page:
        PatientCard[] | { results: PatientCard[]; next: string | null } =
        await apiClient(path, { method: "GET" });
      if (Array.isArray(page)) return [...patients, ...page];
      patients.push(...page.results);
      const next: URL | null = page.next
        ? new URL(page.next, window.location.origin)
        : null;
      path = next ? `${next.pathname}${next.search}` : null;
    }
    return patients;
  },
  adherence: (patientId: string) =>
    apiClient<Adherence>(`${base}/${patientId}/adherence/?days=7`, {
      method: "GET",
    }),
  routine: (patientId: string) =>
    apiClient<RoutineItem[]>(`${base}/${patientId}/routine-items/`, {
      method: "GET",
    }),
  createRoutine: (patientId: string, payload: RoutinePayload) =>
    apiClient<RoutineItem>(`${base}/${patientId}/routine-items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateRoutine: (
    patientId: string,
    itemId: string,
    payload: Partial<RoutinePayload>,
  ) =>
    apiClient<RoutineItem>(`${base}/${patientId}/routine-items/${itemId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteRoutine: (patientId: string, itemId: string) =>
    apiClient<void>(`${base}/${patientId}/routine-items/${itemId}/`, {
      method: "DELETE",
    }),
  family: (patientId: string) =>
    apiClient<FamilyMember[]>(`${base}/${patientId}/family/`, {
      method: "GET",
    }),
  createMemory: (patientId: string, payload: FormData) =>
    apiClient<MemoryRecord>(`${base}/${patientId}/memories/`, {
      method: "POST",
      body: payload,
    }),
  addMemoryPhoto: (patientId: string, memoryId: string, payload: FormData) =>
    apiClient(`${base}/${patientId}/memories/${memoryId}/media/`, {
      method: "POST",
      body: payload,
    }),
  alerts: (patientId: string) =>
    apiClient<CareAlert[]>(`/api/v1/alerts/?patient=${patientId}`, {
      method: "GET",
    }),
  acknowledgeAlert: (alertId: string, note: string) =>
    apiClient<CareAlert>(`/api/v1/alerts/${alertId}/acknowledge/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }),
  forwardAlert: (alertId: string) =>
    apiClient<CareAlert>(`/api/v1/alerts/${alertId}/forward/`, {
      method: "POST",
    }),
  gameSessions: (patientId: string) =>
    apiClient<GameSessionRow[]>(`${base}/${patientId}/game-sessions/`, {
      method: "GET",
    }),
  difficultyChanges: (patientId: string) =>
    apiClient<DifficultyChangeRow[]>(
      `${base}/${patientId}/difficulty-changes/`,
      { method: "GET" },
    ),
  profile: (patientId: string) =>
    apiClient<PatientProfile>(`${base}/${patientId}/profile/`, {
      method: "GET",
    }),
  updateProfile: (patientId: string, payload: PatientProfile) =>
    apiClient<PatientProfile>(`${base}/${patientId}/profile/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  notes: (patientId: string) =>
    apiClient<CareNote[]>(`${base}/${patientId}/notes/`, { method: "GET" }),
  createNote: (patientId: string, text: string) =>
    apiClient<CareNote>(`${base}/${patientId}/notes/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        category: "caregiver_feedback",
        visibility: "care_team",
      }),
    }),
};
