import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { dayInTimezone, reminderIdFor, scheduledFor } from "./reminders";

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
