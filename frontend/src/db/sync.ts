import { apiClient } from "../api/client";
import { db, getMeta, setMeta } from "./schema";
import { isFakeOffline, markAccepted, markRejected, markRetry, nextBatch } from "./outbox";

interface PushResult { accepted: Array<{ outbox_id: string }>; rejected: Array<{ outbox_id: string; code: string; message: string }> }
interface PullResult { server_time: string; records: Record<string, Array<Record<string, unknown>>> }
export async function syncNow(): Promise<boolean> {
  if (isFakeOffline() || (typeof navigator !== "undefined" && !navigator.onLine)) return false;
  const batch = await nextBatch();
  try {
    if (batch.length) {
      const result = await apiClient<PushResult>("/api/v1/sync/push/", { method: "POST", body: JSON.stringify({ items: batch.map((x) => ({ outbox_id: x.id, model: x.model, object_id: x.objectId, patient_id: x.patientId, payload: x.payload, idempotency_key: x.idempotencyKey })) }) });
      await markAccepted(result.accepted.map((x) => x.outbox_id));
      for (const item of result.rejected) await markRejected(item.outbox_id, item.code, item.message);
    }
    const since = await getMeta("lastPullAt");
    const pull = await apiClient<PullResult>(`/api/v1/sync/pull/${since ? `?since=${encodeURIComponent(since)}` : ""}`, { method: "GET" });
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
