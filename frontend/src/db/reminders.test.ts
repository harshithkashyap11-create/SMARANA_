import "fake-indexeddb/auto";
import { createHash, webcrypto } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
import {
  dayInTimezone,
  generateLocalReminders,
  reminderIdFor,
  scheduledFor,
} from "./reminders";
import { db, type CachedRoutineItem } from "./schema";
import { lockVault, openVault } from "./vault";

afterEach(async () => {
  lockVault();
  await db.delete();
  vi.unstubAllGlobals();
});

function referenceId(rule: string, day: string) {
  const digest = createHash("sha1")
    .update(Buffer.from("c64f5d1d63d54b1f98525e6437b78a30", "hex"))
    .update(`${rule}:${day}`)
    .digest()
    .subarray(0, 16);
  digest[6] = (digest[6]! & 15) | 80;
  digest[8] = (digest[8]! & 63) | 128;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
test("reminder IDs match RFC UUID5 independently of device clock and timezone", () => {
  for (const day of ["2026-09-16", "2027-01-01", "2028-02-29"])
    expect(reminderIdFor("4ebd499c-3672-4d7b-a005-4e2a8b50a117", day)).toBe(
      referenceId("4ebd499c-3672-4d7b-a005-4e2a8b50a117", day),
    );
});
test("reminder date uses India time at UTC midnight boundaries", () => {
  expect(dayInTimezone(new Date("2026-09-16T20:00:00Z"))).toBe("2026-09-17");
  const rule = {
    id: "rule",
    patientId: "patient",
    title: "Walk",
    category: "walk",
    time_of_day: "09:00:00",
    days_of_week: [2],
    start_date: "2026-09-01",
    end_date: "2026-09-30",
  };
  expect(scheduledFor(rule, "2026-09-16")).toBe("2026-09-16T03:30:00.000Z");
  expect(scheduledFor(rule, "2026-09-17")).toBeNull();
  expect(scheduledFor(rule, "2026-10-07")).toBeNull();
});

test("offline recurrence edits reschedule pending instances and retain response history", async () => {
  vi.stubGlobal("crypto", webcrypto);
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  openVault("owner", key);
  await db.delete();
  await db.open();
  const day = "2030-09-18";
  const base: CachedRoutineItem = {
    id: "rule",
    patientId: "patient",
    title: "Walk",
    category: "walk",
    time_of_day: "08:00:00",
    days_of_week: [2],
    start_date: "2030-09-01",
  };
  await db.routineItems.bulkPut([base, { ...base, id: "history" }]);
  await generateLocalReminders("patient", day);
  const pendingId = reminderIdFor("rule", day);
  const historyId = reminderIdFor("history", day);
  await db.reminders.update(historyId, { status: "taken" });
  await db.reminderResponses.put({
    id: "response",
    reminderId: historyId,
    action: "taken",
    respondedAt: new Date().toISOString(),
  });
  await db.routineItems.update("rule", {
    time_of_day: "10:30:00",
    title: "Updated walk",
  });
  await generateLocalReminders("patient", day);
  expect((await db.reminders.get(pendingId))?.scheduled_at).toBe(
    "2030-09-18T05:00:00.000Z",
  );
  expect((await db.reminders.get(pendingId))?.title).toBe("Updated walk");
  await db.routineItems.update("rule", { days_of_week: [3] });
  await db.routineItems.update("history", { end_date: "2030-09-17" });
  await generateLocalReminders("patient", day);
  expect(await db.reminders.get(pendingId)).toBeUndefined();
  expect((await db.reminders.get(historyId))?.status).toBe("taken");
  expect((await db.reminders.get(historyId))?.scheduled_at).toBe(
    "2030-09-18T02:30:00.000Z",
  );
  expect(await db.reminderResponses.count()).toBe(1);
});
