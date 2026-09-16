import { apiClient } from "../../api/client";
import { db, type CachedFamilyMember } from "../schema";
import { isFakeOffline } from "../outbox";

export interface Orientation {
  greeting_key: "morning" | "afternoon" | "evening";
  day: string;
  date: string;
  time: string;
  home_label: string;
  next_activity: { id: string; title: string; scheduled_for: string } | null;
  family_member: {
    id: string;
    name: string;
    relationship: string;
    photo_url: string | null;
  } | null;
}

interface PatientList {
  results: Array<{ id: string; name: string }>;
}

function withinThreeSeconds<T>(request: Promise<T>): Promise<T> {
  return Promise.race([
    request,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("Request timed out")), 3_000);
    }),
  ]);
}
export interface PatientRepository {
  getOrientation(): Promise<Orientation>;
}

export class DexiePatientRepository implements PatientRepository {
  async getFamilyMembers(): Promise<CachedFamilyMember[]> {
    const cachedProfile = await db.profile.orderBy("refreshedAt").last();
    const patientId = cachedProfile?.id;
    if (!patientId) return db.familyMembers.toArray();
    if (isFakeOffline() || !navigator.onLine)
      return patientId
        ? db.familyMembers.where("patientId").equals(patientId).toArray()
        : db.familyMembers.toArray();
    try {
      const remote = await apiClient<Array<{ id: string; name: string; relationship_label: string; relationship: string; photo_url: string | null; phone: string; is_emergency_contact: boolean }>>(`/api/v1/patients/${patientId}/family/`, { method: "GET" });
      const members = remote.map((item) => ({ id: item.id, patientId, name: item.name, relationship: item.relationship_label || item.relationship, photoUrl: item.photo_url, phone: item.phone, isEmergencyContact: item.is_emergency_contact }));
      await db.familyMembers.bulkPut(members);
      return members.sort((a, b) => Number(Boolean(b.isEmergencyContact)) - Number(Boolean(a.isEmergencyContact)));
    } catch { return db.familyMembers.where("patientId").equals(patientId).toArray(); }
  }

  async getOrientation(): Promise<Orientation> {
    const cached = await db.profile.orderBy("refreshedAt").last();
    const online = !isFakeOffline() &&
      (typeof navigator === "undefined" || navigator.onLine);
    if (online) {
      try {
        const patients = await withinThreeSeconds(
          apiClient<PatientList>("/api/v1/patients/", { method: "GET" }),
        );
        const patient = patients.results[0];
        if (!patient) throw new Error("Patient profile is unavailable");
        const orientation = await withinThreeSeconds(
          apiClient<Orientation>(
            `/api/v1/patients/${patient.id}/orientation/`,
            { method: "GET" },
          ),
        );
        await db.transaction("rw", db.profile, db.familyMembers, async () => {
          await db.profile.put({
            id: patient.id,
            name: patient.name,
            orientation,
            refreshedAt: new Date().toISOString(),
          });
          await db.familyMembers.where("patientId").equals(patient.id).delete();
          const member = orientation.family_member;
          if (member) {
            const cachedMember: CachedFamilyMember = {
              id: member.id,
              patientId: patient.id,
              name: member.name,
              relationship: member.relationship,
              photoUrl: member.photo_url,
            };
            await db.familyMembers.put(cachedMember);
          }
        });
        return orientation;
      } catch (error) {
        if (!cached) throw error;
      }
    }
    if (cached) return cached.orientation as Orientation;
    throw new Error("Orientation is unavailable");
  }
}

export const patientRepository = new DexiePatientRepository();
