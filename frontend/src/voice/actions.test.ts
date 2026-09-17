import { beforeEach, afterEach, expect, it, vi } from "vitest";
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
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-17T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());
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

it("daily recurrence persists all weekdays with no end date and full confirmation", async () => {
  const action = context();
  let save!: () => void | Promise<void>;
  let message = "";
  action.confirm = (text, callback) => {
    message = text;
    save = callback;
  };
  await performAction(
    {
      intent: "set_reminder",
      slots: { title: "take medicine", time: "20:00", recurrence: "daily" },
      requiresConfirm: true,
    },
    action,
  );
  expect(message).toMatch(/every day.*8:00.*pm.*India time/i);
  await save();
  expect(storage.putRoutine).toHaveBeenCalledWith(
    expect.objectContaining({
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      end_date: null,
    }),
  );
});
it("one-time confirmation includes full date, time and timezone", async () => {
  const action = context();
  await performAction(
    {
      intent: "set_reminder",
      slots: { title: "drink water", time: "20:00", date: "2026-09-18" },
      requiresConfirm: true,
    },
    action,
  );
  expect(action.confirm).toHaveBeenCalledWith(
    expect.stringMatching(/Friday.*18.*September.*2026.*8:00.*pm.*India time/i),
    expect.any(Function),
  );
});
it("stale confirmation cannot create a reminder", async () => {
  const action = context();
  const controller = new AbortController();
  action.signal = controller.signal;
  let save!: () => void | Promise<void>;
  action.confirm = (_text, callback) => (save = callback);
  await performAction(
    {
      intent: "set_reminder",
      slots: { title: "water", time: "20:00" },
      requiresConfirm: true,
    },
    action,
  );
  controller.abort();
  await expect(save()).rejects.toMatchObject({ name: "AbortError" });
  expect(storage.putRoutine).not.toHaveBeenCalled();
  expect(storage.putOutbox).not.toHaveBeenCalled();
});
it("cancellation during a write prevents subsequent outbox and speech effects", async () => {
  const action = context();
  const controller = new AbortController();
  action.signal = controller.signal;
  let save!: () => void | Promise<void>;
  action.confirm = (_text, callback) => (save = callback);
  await performAction(
    {
      intent: "set_reminder",
      slots: { title: "water", time: "20:00" },
      requiresConfirm: true,
    },
    action,
  );
  storage.putRoutine.mockImplementationOnce(() => {
    controller.abort();
    return Promise.resolve();
  });
  await expect(save()).rejects.toMatchObject({ name: "AbortError" });
  expect(storage.putOutbox).not.toHaveBeenCalled();
});
it("aborted turns and model-provided commands never navigate", async () => {
  const action = context();
  action.isActive = () => false;
  await expect(
    performAction(
      {
        intent: "open_section",
        slots: { section: "games" },
        requiresConfirm: false,
      },
      action,
    ),
  ).rejects.toThrow();
  action.isActive = () => true;
  await expect(
    performAction(
      {
        intent: "start_game",
        slots: { game: "memory_match" },
        source: "LOCAL_LLM",
        requiresConfirm: false,
      },
      action,
    ),
  ).rejects.toThrow();
  expect(action.navigate).not.toHaveBeenCalled();
});
it("medication status uses actual today-reminder status, not invented adherence", async () => {
  const action = context();
  vi.mocked(action.routine.getToday).mockResolvedValue([
    {
      id: "med",
      title: "Medicine",
      category: "medicine",
      status: "taken",
      note: "",
      scheduled_at: "2026-09-17T10:00:00Z",
      snoozed_until: null,
    },
  ]);
  await performAction(
    { intent: "medication_status", slots: {}, requiresConfirm: false },
    action,
  );
  expect((action.tts as FakeTextToSpeech).spoken[0]?.text).toContain(
    "Medicine, taken",
  );
  expect(action.routine.getMedications).not.toHaveBeenCalled();
});
it.each(["weekly", "monthly"])(
  "refuses unsupported recurrence %s",
  async (recurrence) => {
    const action = context();
    await expect(
      performAction(
        {
          intent: "set_reminder",
          slots: { title: "water", time: "20:00", recurrence },
          requiresConfirm: true,
        },
        action,
      ),
    ).rejects.toThrow("Unsupported recurrence");
    expect(action.confirm).not.toHaveBeenCalled();
  },
);
