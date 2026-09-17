import { useState } from "react";
import { useTranslation } from "react-i18next";
import { dayInTimezone } from "../../../db/reminders";
import { activeProfile, db } from "../../../db/schema";
import { createOutboxEntry } from "../../../db/outbox";
export function WellnessPage() {
  const { t } = useTranslation();
  const [bed, setBed] = useState("22:00");
  const [wake, setWake] = useState("07:00");
  const [date, setDate] = useState(dayInTimezone());
  const [quality, setQuality] = useState(3);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(
    kind: "sleep_log" | "mood_log",
    fields: Record<string, unknown>,
  ) {
    setBusy(true);
    try {
      const profile = await activeProfile();
      if (!profile) throw new Error();
      const id = crypto.randomUUID();
      const stamp = new Date().toISOString();
      const payload = {
        id,
        patient_id: profile.id,
        source: "patient",
        device_updated_at: stamp,
        ...fields,
      };
      const table = kind === "sleep_log" ? db.sleepLogs : db.moodLogs;
      await db.transaction("rw", table, db.outbox, async () => {
        await table.put({
          ...payload,
          patientId: profile.id,
          deviceUpdatedAt: stamp,
        });
        await db.outbox.put(createOutboxEntry(kind, id, profile.id, payload));
      });
      setStatus("saved");
    } catch {
      setStatus("retry");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <h1 className="text-3xl">{t("wellness.title")}</h1>
      <h2>{t("wellness.mood")}</h2>
      <div className="flex flex-wrap gap-3">
        {["great", "good", "ok", "low", "bad"].map((mood, i) => (
          <button
            disabled={busy}
            className="min-h-touch min-w-touch rounded-card bg-surface p-4 text-2xl"
            key={mood}
            onClick={() =>
              void save("mood_log", {
                mood,
                logged_at: new Date().toISOString(),
              })
            }
          >
            {["😄", "🙂", "😐", "🙁", "😢"][i]}
            <span className="block text-lg">{t(`wellness.${mood}`)}</span>
          </button>
        ))}
      </div>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save("sleep_log", {
            date,
            bed_time: bed,
            wake_time: wake,
            quality,
          });
        }}
      >
        <label>
          {t("wellness.date")}
          <input
            className="min-h-touch"
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          {t("wellness.bed")}
          <input
            className="min-h-touch"
            required
            type="time"
            value={bed}
            onChange={(e) => setBed(e.target.value)}
          />
        </label>
        <label>
          {t("wellness.wake")}
          <input
            className="min-h-touch"
            required
            type="time"
            value={wake}
            onChange={(e) => setWake(e.target.value)}
          />
        </label>
        <label>
          {t("wellness.quality")}
          <select
            className="min-h-touch"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((q) => (
              <option key={q} value={q}>
                {["😞", "🙁", "😐", "🙂", "😊"][q - 1]}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy}
          className="min-h-touch rounded-card bg-primary p-4 text-primary-text"
        >
          {t("wellness.save")}
        </button>
      </form>
      {status && <p role="status">{t(`wellness.${status}`)}</p>}
    </section>
  );
}
