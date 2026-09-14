import { apiClient } from "../../api/client";
import { db, type CachedFamilyMember } from "../schema";

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
export interface PatientRepository {
  getOrientation(): Promise<Orientation>;
}

export class DexiePatientRepository implements PatientRepository {
  async getOrientation(): Promise<Orientation> {
    const cached = await db.profile.orderBy("refreshedAt").last();
    const online = typeof navigator === "undefined" || navigator.onLine;
    if (online) {
      try {
        const patients = await apiClient<PatientList>("/api/v1/patients/", {
          method: "GET",
        });
        const patient = patients.results[0];
        if (!patient) throw new Error("Patient profile is unavailable");
        const orientation = await apiClient<Orientation>(
          `/api/v1/patients/${patient.id}/orientation/`,
          { method: "GET" },
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
