import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { db } from "../db/schema";
import { openVault, lockVault } from "../db/vault";
import { performAction, type ActionContext } from "./actions";
import { FakeTextToSpeech } from "./tts";
beforeEach(async () => {
  vi.stubGlobal("crypto", webcrypto);
  await db.delete();
  await db.open();
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  openVault("patient-1", key);
});
afterEach(async () => {
  lockVault();
  await db.delete();
  vi.unstubAllGlobals();
});
function context(): ActionContext {
  return {
    navigate: vi.fn(),
    tts: new FakeTextToSpeech(),
    patientId: "patient-1",
    confirm: vi.fn(),
    routine: { getToday: vi.fn(), getMedications: vi.fn(), respond: vi.fn() },
  };
}
const command = {
  intent: "set_reminder" as const,
  slots: {
    title: "Private medicine reminder",
    time: "20:00",
    date: "2099-09-18",
    recurrence: "daily",
  },
  requiresConfirm: true,
};
it("persists a daily rule and outbox atomically using actual encrypted Dexie middleware", async () => {
  const action = context();
  let save!: () => void | Promise<void>;
  action.confirm = (_message, callback) => (save = callback);
  await performAction(command, action);
  expect(await db.routineItems.count()).toBe(0);
  await save();
  const rule = await db.routineItems.toCollection().first();
  const outbox = await db.outbox.toCollection().first();
  expect(rule).toMatchObject({
    title: command.slots.title,
    end_date: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
  });
  expect(outbox?.payload).toMatchObject({
    title: command.slots.title,
    end_date: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
  });
});
it("abort during transaction rolls back both rule and outbox", async () => {
  const action = context();
  const controller = new AbortController();
  action.signal = controller.signal;
  let save!: () => void | Promise<void>;
  action.confirm = (_message, callback) => (save = callback);
  await performAction(command, action);
  const abort = () => controller.abort();
  db.routineItems.hook("creating", abort);
  try {
    await expect(save()).rejects.toThrow();
  } finally {
    db.routineItems.hook("creating").unsubscribe(abort);
  }
  expect(await db.routineItems.count()).toBe(0);
  expect(await db.outbox.count()).toBe(0);
});
it("failed outbox write rolls back the reminder rule", async () => {
  const action = context();
  let save!: () => void | Promise<void>;
  action.confirm = (_message, callback) => (save = callback);
  await performAction(command, action);
  const fail = () => {
    throw new Error("Outbox failed");
  };
  db.outbox.hook("creating", fail);
  try {
    await expect(save()).rejects.toThrow("Outbox failed");
  } finally {
    db.outbox.hook("creating").unsubscribe(fail);
  }
  expect(await db.routineItems.count()).toBe(0);
  expect(await db.outbox.count()).toBe(0);
  expect(
    (action.tts as FakeTextToSpeech).spoken.some(
      (item) => item.text === "Your reminder is saved.",
    ),
  ).toBe(false);
});
