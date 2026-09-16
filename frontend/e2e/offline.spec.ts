import { expect, test, type Page } from "@playwright/test";

const patientId = "patient-offline-e2e";
const reminderId = "reminder-offline-e2e";
const gameSessionId = "game-session-offline-e2e";
const now = "2026-09-16T08:00:00.000Z";

type PushItem = {
  outbox_id?: string;
  model: string;
  object_id: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
};

function idempotencyKey(model: string, objectId: string, updatedAt: string) {
  return `${model}:${objectId}:${Date.parse(updatedAt)}`;
}

async function seedOfflineData(page: Page) {
  await page.evaluate(
    async ({ gameSessionId, now, patientId, reminderId }) => {
      const open = indexedDB.open("smarana");
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onerror = () =>
          reject(open.error ?? new Error("Unable to open IndexedDB"));
        open.onsuccess = () => resolve(open.result);
      });
      const put = (store: string, value: unknown) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(store, "readwrite");
          tx.objectStore(store).put(value);
          tx.oncomplete = () => resolve();
          tx.onerror = () =>
            reject(tx.error ?? new Error(`Unable to write ${store}`));
        });
      await put("profile", {
        id: patientId,
        name: "Rao",
        refreshedAt: now,
        orientation: {
          greeting_key: "morning",
          day: "Wednesday",
          date: "September 16, 2026",
          time: "8:00 AM",
          home_label: "Home",
          next_activity: {
            id: reminderId,
            title: "Morning tablet",
            scheduled_for: now,
          },
          family_member: null,
        },
      });
      await put("reminders", {
        id: reminderId,
        patientId,
        title: "Morning tablet",
        category: "medicine",
        note: "With water",
        scheduled_at: now,
        status: "pending",
        snoozed_until: null,
      });
      await put("gameDefinitions", {
        key: "sequence_recall",
        name: "Sequence Recall",
        cognitive_domains: ["memory"],
        min_level: 1,
        max_level: 10,
        is_regional: false,
      });
      const gamePayload = {
        id: gameSessionId,
        patient_id: patientId,
        game_key: "sequence_recall",
        seed: "offline-seed",
        level: 1,
        metrics: {
          accuracy: 1,
          mean_reaction_ms: 900,
          mistakes: 0,
          hints_used: 0,
          rounds: 1,
          duration_ms: 1200,
          completed: true,
          abandoned_reason: null,
          fatigue_flags: [],
          raw_events: [],
        },
        challenge_mode: false,
        started_at: now,
        ended_at: now,
        device_updated_at: now,
      };
      await put("gameSessions", {
        id: gameSessionId,
        patientId,
        gameKey: "sequence_recall",
        seed: "offline-seed",
        level: 1,
        metrics: gamePayload.metrics,
        challengeMode: false,
        startedAt: now,
        endedAt: now,
        synced: false,
      });
      await put("outbox", {
        id: "outbox-game-session-offline-e2e",
        model: "game_session",
        objectId: gameSessionId,
        patientId,
        payload: gamePayload,
        idempotencyKey: `game_session:${gameSessionId}:${Date.parse(now)}`,
        createdAt: now,
        attempts: 0,
        nextAttemptAt: now,
      });
      db.close();
    },
    { gameSessionId, now, patientId, reminderId },
  );
}

async function enterPatientPin(page: Page) {
  for (const digit of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

async function unlockOfflinePatientSession(page: Page) {
  await page.getByRole("button", { name: /Patient/ }).click();
  await expect(page.getByLabel("Login ID")).toHaveValue("RAO1234");
  await enterPatientPin(page);
  await expect(page).toHaveURL(/\/patient$/);
}

async function openRoutineFromPatientHome(page: Page) {
  await page.getByRole("button", { name: /routine/i }).click();
  await expect(page).toHaveURL(/\/patient\/routine$/);
}

test("offline reminder and game records survive reload and sync once", async ({
  page,
  context,
}) => {
  const pushed: PushItem[] = [];
  const acceptedKeys = new Set<string>();
  const acceptedObjects = new Set<string>();
  const acceptedAttempts = new Map<string, number>();

  await page.route("**/api/v1/auth/patient/login/", async (route) => {
    await route.fulfill({
      json: {
        access: "patient-access",
        refresh: "patient-refresh",
        user: {
          id: "user-patient",
          display_name: "Rao",
          email: "",
          phone: "",
          role: "patient",
        },
      },
      status: 200,
    });
  });
  await page.route("**/api/v1/patients/", async (route) => {
    await route.fulfill({
      json: { results: [{ id: patientId, name: "Rao" }] },
    });
  });
  await page.route("**/api/v1/patients/*/orientation/", async (route) => {
    await route.fulfill({
      json: {
        greeting_key: "morning",
        day: "Wednesday",
        date: "September 16, 2026",
        time: "8:00 AM",
        home_label: "Home",
        next_activity: {
          id: reminderId,
          title: "Morning tablet",
          scheduled_for: now,
        },
        family_member: null,
      },
    });
  });
  await page.route("**/api/v1/sync/pull/**", async (route) => {
    await route.fulfill({
      json: {
        server_time: now,
        records: { reminders: [], difficulty_states: [] },
      },
    });
  });
  await page.route("**/api/v1/sync/push/", async (route) => {
    const body = route.request().postDataJSON() as { items: PushItem[] };
    pushed.push(...body.items);
    const accepted = body.items.map((item) => {
      acceptedKeys.add(item.idempotency_key);
      acceptedObjects.add(`${item.model}:${item.object_id}`);
      acceptedAttempts.set(
        item.idempotency_key,
        (acceptedAttempts.get(item.idempotency_key) ?? 0) + 1,
      );
      return { outbox_id: item.outbox_id ?? item.object_id };
    });
    await route.fulfill({ json: { accepted, rejected: [] }, status: 200 });
  });

  await page.goto("/login/patient");
  await page.getByLabel("Login ID").fill("RAO1234");
  await enterPatientPin(page);
  await expect(page).toHaveURL(/\/patient$/);

  await seedOfflineData(page);
  await openRoutineFromPatientHome(page);
  await expect(page.getByText("Morning tablet")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await unlockOfflinePatientSession(page);
  await openRoutineFromPatientHome(page);
  await expect(page.getByText("Working offline")).toBeVisible();
  await page.getByRole("button", { name: "Taken" }).click();
  await expect(page.getByText("Saved safely on this device.")).toBeVisible();

  await page.reload();
  await unlockOfflinePatientSession(page);
  await openRoutineFromPatientHome(page);
  await expect(page.getByText("Working offline")).toBeVisible();
  await expect(page.getByText("Morning tablet")).toBeVisible();
  const local = await page.evaluate(async () => {
    const open = indexedDB.open("smarana");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onerror = () =>
        reject(open.error ?? new Error("Unable to open IndexedDB"));
      open.onsuccess = () => resolve(open.result);
    });
    const all = <T>(store: string) =>
      new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const request = tx.objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () =>
          reject(request.error ?? new Error(`Unable to read ${store}`));
      });
    const result = {
      outbox: await all<{ model: string; objectId: string }>("outbox"),
      responses: await all<{ reminderId: string; action: string }>(
        "reminderResponses",
      ),
      sessions: await all<{ id: string }>("gameSessions"),
    };
    db.close();
    return result;
  });
  const reminderResponse = local.outbox.find(
    (item) => item.model === "reminder_response",
  );
  expect(local.responses).toEqual([
    expect.objectContaining({ action: "taken", reminderId }),
  ]);
  expect(local.sessions).toEqual([
    expect.objectContaining({ id: gameSessionId }),
  ]);
  expect(local.outbox).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ model: "reminder_response" }),
      expect.objectContaining({
        model: "game_session",
        objectId: gameSessionId,
      }),
    ]),
  );

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect
    .poll(() => pushed.map((item) => `${item.model}:${item.object_id}`), {
      timeout: 10_000,
    })
    .toEqual(
      expect.arrayContaining([
        `reminder_response:${reminderResponse?.objectId}`,
        `game_session:${gameSessionId}`,
      ]),
    );

  const firstPush = [...pushed];
  const replayItems = firstPush.map((item) => ({
    outbox_id: `replay-${item.object_id}`,
    model: item.model,
    object_id: item.object_id,
    patient_id: patientId,
    payload: item.payload,
    idempotency_key: item.idempotency_key,
  }));
  await page.evaluate(async (items) => {
    await fetch("/api/v1/sync/push/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  }, replayItems);

  expect(acceptedObjects).toEqual(
    new Set([
      `game_session:${gameSessionId}`,
      `reminder_response:${reminderResponse?.objectId}`,
    ]),
  );
  const gameSessionPushes = pushed.filter((item) =>
    item.idempotency_key.startsWith("game_session:"),
  );
  expect(gameSessionPushes.length).toBeGreaterThanOrEqual(2);
  expect(
    new Set(gameSessionPushes.map((item) => item.idempotency_key)).size,
  ).toBe(1);
  expect(acceptedKeys.size).toBe(acceptedObjects.size);
  expect(
    pushed.some(
      (item) =>
        item.model === "game_session" &&
        item.idempotency_key ===
          idempotencyKey("game_session", gameSessionId, now),
    ),
  ).toBe(true);
  expect(
    acceptedAttempts.get(idempotencyKey("game_session", gameSessionId, now)),
  ).toBeGreaterThanOrEqual(2);
  expect(acceptedObjects.size).toBe(2);
});
