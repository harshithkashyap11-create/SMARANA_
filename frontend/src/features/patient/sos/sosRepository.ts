import { apiClient } from "../../../api/client";
import { db } from "../../../db/schema";

export async function sendSos(): Promise<void> {
  const patient = await db.profile.orderBy("refreshedAt").last();
  if (!patient) throw new Error("Patient profile is unavailable");
  await apiClient(`/api/v1/patients/${patient.id}/sos/`, { method: "POST", body: JSON.stringify({ idempotency_key: crypto.randomUUID() }) });
}
