import { apiClient } from "../../api/client";

export type DoctorPatientCard = {
  id: string;
  name: string;
  flag_count: number;
  last_session_at: string | null;
  engagement_status: "active" | "quiet" | "inactive";
};

export type DoctorDashboardData = {
  patients: DoctorPatientCard[];
  needs_attention: DoctorPatientCard[];
  reviews_due: DoctorPatientCard[];
  recent_completed: DoctorPatientCard[];
};

export type DoctorPatient = {
  id: string;
  name: string;
  age: number | null;
  primary_caregiver_name: string | null;
};

export const doctorApi = {
  dashboard: () =>
    apiClient<DoctorDashboardData>("/api/v1/doctor/dashboard/", {
      method: "GET",
    }),
  patient: (patientId: string) =>
    apiClient<DoctorPatient>(`/api/v1/patients/${patientId}/`, {
      method: "GET",
    }),
  metrics: (patientId: string, window: number) =>
    apiClient<{
      window_days: number;
      domains: Array<{ domain: string; sessions: number; mean_accuracy?: number | null; trend: string }>;
      sessions?: Array<{ id: string; game: string; level: number; ended_at: string }>;
    }>(`/api/v1/patients/${patientId}/metrics/?window=${window}`, { method: "GET" }),
  difficulty: (patientId: string) =>
    apiClient<Array<{
      game_key: string; game_name: string; level: number; locked: boolean; cap_level: number | null;
      changes: Array<{ id: string; explanation: string; reason_code: string; session_id: string | null }>;
    }>>(`/api/v1/patients/${patientId}/difficulty/`, { method: "GET" }),
  overrideDifficulty: (patientId: string, gameKey: string, body: object) =>
    apiClient(`/api/v1/patients/${patientId}/difficulty/${gameKey}/override/`, {
      method: "POST", body: JSON.stringify(body),
    }),
  medications: (patientId: string) =>
    apiClient<Array<{ id: string; name: string; dose: string; times: string[]; active: boolean }>>(
      `/api/v1/patients/${patientId}/medications/`, { method: "GET" },
    ),
  createMedication: (patientId: string, body: object) =>
    apiClient(`/api/v1/patients/${patientId}/medications/`, {
      method: "POST", body: JSON.stringify(body),
    }),
  assignments: (patientId: string) =>
    apiClient<Array<{
      id: string; game_name: string; review_date: string;
      completion: { planned_this_week: number; done_this_week: number };
    }>>(`/api/v1/patients/${patientId}/assignments/`, { method: "GET" }),
  games: () => apiClient<Array<{ id: string; key: string; name: string }>>(
    "/api/v1/games/", { method: "GET" },
  ),
  createAssignment: (patientId: string, body: object) =>
    apiClient(`/api/v1/patients/${patientId}/assignments/`, {
      method: "POST", body: JSON.stringify(body),
    }),
  notes: (patientId: string) =>
    apiClient<Array<{
      id: string; author_name: string; category: string; status_summary: string; text: string;
      visibility: string; follow_up_date: string | null; created_at: string;
    }>>(`/api/v1/patients/${patientId}/notes/`, { method: "GET" }),
  createNote: (patientId: string, body: object) =>
    apiClient(`/api/v1/patients/${patientId}/notes/`, {
      method: "POST", body: JSON.stringify(body),
    }),
  baseline: (patientId: string) => apiClient<Record<string, unknown>>(
    `/api/v1/patients/${patientId}/baseline/`, { method: "GET" },
  ),
  saveBaseline: (patientId: string, body: object) => apiClient(
    `/api/v1/patients/${patientId}/baseline/`, { method: "PUT", body: JSON.stringify(body) },
  ),
};
