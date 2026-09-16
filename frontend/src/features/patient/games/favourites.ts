import { activeProfile, db, getMeta, setMeta } from "../../../db/schema";
import { createOutboxEntry } from "../../../db/outbox";
export interface Favourite {
  kind: "game" | "memory";
  id: string;
}
export async function favourites(): Promise<Favourite[]> {
  return JSON.parse((await getMeta("favourites")) ?? "[]") as Favourite[];
}
export async function toggleFavourite(value: Favourite) {
  const profile = await activeProfile();
  if (!profile) return;
  await db.transaction("rw", db.meta, db.outbox, async () => {
    const old = await favourites();
    const next = old.some(
      (item) => item.kind === value.kind && item.id === value.id,
    )
      ? old.filter((item) => item.kind !== value.kind || item.id !== value.id)
      : [...old, value];
    await setMeta("favourites", JSON.stringify(next));
    await db.outbox.put(
      createOutboxEntry("patient_profile_favourites", profile.id, profile.id, {
        id: profile.id,
        patient_id: profile.id,
        favourites: next,
        device_updated_at: new Date().toISOString(),
      }),
    );
  });
}
export function suggestActivity(
  now: Date,
  assigned: Array<{ id: string; due: string; kind?: string; slot?: string }>,
  saved: Favourite[],
  engagement: Array<{ kind: string; id: string; at: string }>,
): Favourite | null {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const slot =
    now.getHours() < 12
      ? "morning"
      : now.getHours() < 18
        ? "afternoon"
        : "evening";
  const today = assigned.filter((item) => item.due === day);
  const due = today.find((item) => item.slot === slot) ?? today[0];
  if (due)
    return { kind: due.kind === "memory" ? "memory" : "game", id: due.id };
  const favourite = saved.find(
    (item) =>
      !engagement.some(
        (event) =>
          event.kind === item.kind &&
          event.id === item.id &&
          now.getTime() - Date.parse(event.at) < 3 * 86400000,
      ),
  );
  return (
    favourite ?? (now.getHours() >= 18 ? { kind: "game", id: "calm" } : null)
  );
}
