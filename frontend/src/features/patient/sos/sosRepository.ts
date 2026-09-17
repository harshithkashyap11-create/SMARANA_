import { activeProfile, db } from "../../../db/schema";
import { createOutboxEntry } from "../../../db/outbox";
import { syncNow } from "../../../db/sync";
export async function sendSos(): Promise<boolean> {
 const patient = await activeProfile();
 if (!patient) throw new Error("Patient profile unavailable");
 const id = crypto.randomUUID(), now = new Date().toISOString();
 await db.transaction("rw", db.sosEvents, db.outbox, async () => {
   await db.sosEvents.put({id, patientId: patient.id, deviceUpdatedAt: now, triggeredAt: now});
   await db.outbox.put(createOutboxEntry("sos_event", id, patient.id, {id, patient_id: patient.id, triggered_at: now, device_updated_at: now}));
 });
 await syncNow();
 return !(await db.outbox.where("objectId").equals(id).count()) && !(await db.outboxDead.where("model").equals("sos_event").filter((x) => x.objectId === id).count());
}
