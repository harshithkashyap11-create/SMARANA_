import { apiClient } from "../../api/client";

export type PatientCard = {
  id: string;
  name: string;
  is_primary: boolean;
  last_active_at: string | null;
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

const base = "/api/v1/patients";
export const caregiverApi = {
  patients: () => apiClient<PatientCard[]>(`${base}/`, { method: "GET" }),
  adherence: (patientId: string) =>
    apiClient<Adherence>(`${base}/${patientId}/adherence/?days=7`, { method: "GET" }),
  routine: (patientId: string) =>
    apiClient<RoutineItem[]>(`${base}/${patientId}/routine-items/`, { method: "GET" }),
  createRoutine: (patientId: string, payload: RoutinePayload) =>
    apiClient<RoutineItem>(`${base}/${patientId}/routine-items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateRoutine: (patientId: string, itemId: string, payload: Partial<RoutinePayload>) =>
    apiClient<RoutineItem>(`${base}/${patientId}/routine-items/${itemId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteRoutine: (patientId: string, itemId: string) =>
    apiClient<void>(`${base}/${patientId}/routine-items/${itemId}/`, { method: "DELETE" }),
};
