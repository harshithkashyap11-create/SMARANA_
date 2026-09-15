import { db, type OutboxEntry, type SyncModel } from "./schema";

const delays = [60_000, 300_000, 1_800_000, 21_600_000];
export function makeIdempotencyKey(model: SyncModel, objectId: string, deviceUpdatedAt: string): string {
  return `${model}:${objectId}:${Date.parse(deviceUpdatedAt)}`;
}
export function createOutboxEntry(model: SyncModel, objectId: string, patientId: string, payload: Record<string, unknown>, now = new Date()): OutboxEntry {
  const candidate = payload.device_updated_at;
  const deviceUpdatedAt = typeof candidate === "string" ? candidate : now.toISOString();
  return { id: crypto.randomUUID(), model, objectId, patientId, payload, idempotencyKey: makeIdempotencyKey(model, objectId, deviceUpdatedAt), createdAt: now.toISOString(), attempts: 0, nextAttemptAt: now.toISOString() };
}
export async function nextBatch(now = new Date(), limit = 50): Promise<OutboxEntry[]> {
  return (await db.outbox.where("nextAttemptAt").belowOrEqual(now.toISOString()).sortBy("createdAt")).slice(0, limit);
}
export async function markAccepted(ids: string[]): Promise<void> { await db.outbox.bulkDelete(ids); }
export async function markRejected(id: string, code: string, message: string): Promise<void> {
  const item = await db.outbox.get(id); if (!item) return;
  await db.transaction("rw", db.outbox, db.outboxDead, async () => { await db.outboxDead.put({ ...item, code, lastError: message, rejectedAt: new Date().toISOString() }); await db.outbox.delete(id); });
}
export async function markRetry(id: string, message: string, now = new Date()): Promise<void> {
  const item = await db.outbox.get(id); if (!item) return;
  const attempts = item.attempts + 1; const delay = delays[Math.min(attempts - 1, delays.length - 1)] ?? 21_600_000;
  await db.outbox.update(id, { attempts, lastError: message, nextAttemptAt: new Date(now.getTime() + delay).toISOString() });
}
export const isFakeOffline = (): boolean => import.meta.env.VITE_FAKE_OFFLINE === "1";
