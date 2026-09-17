import { createOutboxEntry } from "./outbox";
import { db, getMeta, setMeta } from "./schema";
export type ComfortSettings = {
  language_locked?: boolean;
  slow_speech?: boolean;
  font_scale?: number;
  theme?: "light" | "dark";
};
export async function saveComfortSettings(
  settings: ComfortSettings,
): Promise<void> {
  const patientId = await getMeta("patientId");
  if (!patientId) return;
  const now = new Date().toISOString();
  await db.transaction("rw", db.meta, db.outbox, async () => {
    const keys: Record<string, string> = {
      language_locked: "languageLocked",
      slow_speech: "slowSpeech",
      font_scale: "fontScale",
      theme: "theme",
    };
    for (const [key, value] of Object.entries(settings))
      await setMeta(
        keys[key]!,
        typeof value === "boolean" ? (value ? "1" : "0") : String(value),
      );
    await setMeta("accessibilityPending", "1");
    await db.outbox.put(
      createOutboxEntry("accessibility", patientId, patientId, {
        id: patientId,
        patient_id: patientId,
        settings,
        device_updated_at: now,
      }),
    );
  });
}
