import { beforeEach, expect, it, vi } from "vitest";
import { performAction, type ActionContext } from "./actions";
import { FakeTextToSpeech } from "./tts";
const storage = vi.hoisted(() => ({
  putRoutine: vi.fn().mockResolvedValue(undefined),
  putOutbox: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db/schema", () => ({
  db: {
    routineItems: { put: storage.putRoutine },
    outbox: { put: storage.putOutbox },
    transaction: vi.fn(
      (_mode, _items, _outbox, callback: () => Promise<void>) => callback(),
    ),
  },
}));
beforeEach(() => vi.clearAllMocks());
const context = (): ActionContext => ({
  navigate: vi.fn(),
  tts: new FakeTextToSpeech(),
  patientId: "patient-1",
  confirm: vi.fn(),
  routine: { getToday: vi.fn(), getMedications: vi.fn(), respond: vi.fn() },
});
it("uses existing routes and speaks navigation feedback", async () => {
  const action = context();
  await performAction(
    {
      intent: "open_section",
      slots: { section: "profile" },
      requiresConfirm: false,
    },
    action,
  );
  expect(action.navigate).toHaveBeenCalledWith("/patient/settings");
  expect((action.tts as FakeTextToSpeech).spoken[0]?.text).toContain("Opening");
});
it.each(["https://evil.invalid", "../../admin", "constructor", "__proto__"])(
  "rejects model-provided section %s",
  async (section) => {
    const action = context();
    await expect(
      performAction(
        { intent: "open_section", slots: { section }, requiresConfirm: false },
        action,
      ),
    ).rejects.toThrow();
    expect(action.navigate).not.toHaveBeenCalled();
  },
);
it("creates reminders only after confirmation and reports success after persistence", async () => {
  const action = context();
  let save!: () => void | Promise<void>;
  action.confirm = (_message, callback) => {
    save = callback;
  };
  await performAction(
    {
      intent: "set_reminder",
      slots: { title: "Drink water", time: "20:00", date: "2026-09-18" },
      requiresConfirm: true,
    },
    action,
  );
  expect(storage.putRoutine).not.toHaveBeenCalled();
  await save();
  expect(storage.putRoutine).toHaveBeenCalledWith(
    expect.objectContaining({
      patientId: "patient-1",
      time_of_day: "20:00",
      start_date: "2026-09-18",
      end_date: "2026-09-18",
    }),
  );
  expect(storage.putOutbox).toHaveBeenCalledOnce();
  expect((action.tts as FakeTextToSpeech).spoken.at(-1)?.text).toBe(
    "Your reminder is saved.",
  );
});
it("does not falsely confirm a failed reminder save", async () => {
  const action = context();
  let save!: () => void | Promise<void>;
  action.confirm = (_message, callback) => {
    save = callback;
  };
  storage.putRoutine.mockRejectedValueOnce(new Error("Storage failed"));
  await performAction(
    {
      intent: "set_reminder",
      slots: { title: "Water", time: "20:00" },
      requiresConfirm: true,
    },
    action,
  );
  await expect(save()).rejects.toThrow("Storage failed");
  expect(
    (action.tts as FakeTextToSpeech).spoken.some(
      (item) => item.text === "Your reminder is saved.",
    ),
  ).toBe(false);
});
