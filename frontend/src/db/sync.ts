import { apiClient } from "../api/client";
import { db, getMeta, setMeta } from "./schema";
import { isFakeOffline, markAccepted, markRejected, markRetry, nextBatch } from "./outbox";

interface PushResult { accepted: Array<{ outbox_id: string }>; rejected: Array<{ outbox_id: string; code: string; message: string }> }
interface PullResult { server_time: string; records: Record<string, Array<Record<string, unknown>>> }
async function applyPull(records: PullResult["records"]): Promise<void> {
  const reminders = records.reminders ?? [];
  const difficultyStates = records.difficulty_states ?? [];
  if (!reminders.length && !difficultyStates.length) return;
  const patientId = await getMeta("patientId") ?? (await db.profile.orderBy("refreshedAt").last())?.id;
  if (!patientId) return;
  await db.transaction("rw", db.reminders, db.difficultyStates, async () => {
    if (reminders.length)
      await db.reminders.bulkPut(reminders.map((item) => ({
        id: String(item.id),
        patientId,
        title: typeof item.title === "string" ? item.title : "",
        category: typeof item.category === "string" ? item.category : "custom",
        note: typeof item.note === "string" ? item.note : "",
        scheduled_at: String(item.scheduled_at),
        status: String(item.status),
        snoozed_until: typeof item.snoozed_until === "string" ? item.snoozed_until : null,
      })));
    if (difficultyStates.length)
      await db.difficultyStates.bulkPut(difficultyStates.map((item) => ({
        id: String(item.id),
        patientId,
        gameKey: String(item.game_key),
        level: Number(item.level),
        window: Array.isArray(item.window) ? item.window : [],
        lockedByDoctor: Boolean(item.locked_by_doctor),
        capLevel: item.cap_level == null ? null : Number(item.cap_level),
        minLevel: Number(item.min_level),
        maxLevel: Number(item.max_level),
      })));
  });
}
export async function syncNow(): Promise<boolean> {
  if (isFakeOffline() || (typeof navigator !== "undefined" && !navigator.onLine)) return false;
  const batch = await nextBatch();
  try {
    if (batch.length) {
      const result = await apiClient<PushResult>("/api/v1/sync/push/", { method: "POST", body: JSON.stringify({ items: batch.map((x) => ({ outbox_id: x.id, model: x.model, object_id: x.objectId, patient_id: x.patientId, payload: x.payload, idempotency_key: x.idempotencyKey })) }) });
      await markAccepted(result.accepted.map((x) => x.outbox_id));
      const acceptedIds = new Set(result.accepted.map((item) => item.outbox_id));
      const acceptedSessions = batch.filter(
        (item) => item.model === "game_session" && acceptedIds.has(item.id),
      );
      if (acceptedSessions.length)
        await db.gameSessions.bulkUpdate(
          acceptedSessions.map((item) => ({ key: item.objectId, changes: { synced: true } })),
        );
      for (const item of result.rejected) await markRejected(item.outbox_id, item.code, item.message);
    }
    const since = await getMeta("lastPullAt");
    const pull = await apiClient<PullResult>(`/api/v1/sync/pull/${since ? `?since=${encodeURIComponent(since)}` : ""}`, { method: "GET" });
    await applyPull(pull.records);
    await setMeta("lastPullAt", pull.server_time);
    return true;
  } catch (error) {
    for (const item of batch) await markRetry(item.id, error instanceof Error ? error.message : "network");
    return false;
  }
}
export function installSyncTriggers(): () => void {
  const run = () => { void syncNow(); };
  window.addEventListener("online", run); document.addEventListener("visibilitychange", run);
  const timer = window.setInterval(run, 300_000);
  return () => { window.removeEventListener("online", run); document.removeEventListener("visibilitychange", run); window.clearInterval(timer); };
}
export async function pendingOnDevice(): Promise<boolean> { return (await db.outbox.count()) > 0 || (await db.outboxDead.count()) > 0; }
