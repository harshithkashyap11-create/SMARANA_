import { readEncryptedRecords } from "./encrypted-db";
import { expect, test, type Page } from "@playwright/test";

const patientId = "patient-offline-e2e";
const reminderId = "reminder-offline-e2e";
const gameSessionId = "game-session-offline-e2e";
const now = new Date().toISOString();

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
      const read = (store: string, key: string) => new Promise<{ value: string }>((resolve, reject) => {
        const r = db.transaction(store).objectStore(store).get(key); r.onsuccess = () => resolve(r.result as { value: string }); r.onerror = () => reject(r.error ?? new Error("IndexedDB failed"));
      });
      const secrets = JSON.parse((await read("meta", "pinVerifier")).value) as { owner: string; salt: string; keyIv: string; wrappedKey: string };
      const bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
      const material = await crypto.subtle.importKey("raw", new TextEncoder().encode("1234"), "PBKDF2", false, ["deriveKey"]);
      const wrapping = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(secrets.salt), iterations: 210000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      const key = await crypto.subtle.importKey("raw", await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(secrets.keyIv) }, wrapping, bytes(secrets.wrappedKey)), "AES-GCM", false, ["encrypt"]);
      const b64 = (v: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(v)));
      const put = async (store: string, value: Record<string, unknown>) => {
        let persisted = value;
        const publicMeta = new Set(["patientId", "patientUserId", "pinVerifier", "refreshTokenEncrypted"]);
        if (store !== "gameDefinitions" && !(store === "meta" && publicMeta.has(String(value.key)))) {
          const primary = store === "meta" ? "key" : "id";
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(`${secrets.owner}:${store}:${String(value[primary])}`) }, key, new TextEncoder().encode(JSON.stringify(value)));
          const indexed: Record<string, unknown> = {};
          for (const field of [primary, "patientId", "reminderId", "createdAt", "nextAttemptAt", "model", "objectId", "gameKey", "synced"]) if (field in value) indexed[field] = value[field];
          persisted = { ...indexed, __sealed: { version: 1, owner: secrets.owner, iv: b64(iv), ciphertext: b64(ciphertext) } };
        }
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(store, "readwrite"); tx.objectStore(store).put(persisted); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error("IndexedDB failed"));
        });
      };
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
  await page.getByLabel("Login ID").fill("RAO1234");
  await enterPatientPin(page);
  await expect(page).toHaveURL(/(?<!login)\/patient$/);
}

async function openRoutineFromPatientHome(page: Page) {
  await page.getByRole("button", { name: /routine/i }).click();
  await expect(page).toHaveURL(/\/patient\/routine$/);
}

test("offline reminder and game records survive reload and sync once", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  // Mock credentials must never reach a live backend through ancillary requests.
  // Register first so the explicit workflow routes below take precedence.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 503, json: { detail: "Outside this mocked workflow" } }),
  );
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
  await page.route("**/api/v1/patients/*/reminders/**", async (route) => {
    await route.fulfill({
      json: [
        {
          id: reminderId,
          title: "Morning tablet",
          category: "medicine",
          note: "With water",
          scheduled_at: now,
          status: "pending",
          snoozed_until: null,
        },
      ],
    });
  });
  await page.route("**/api/v1/sync/pull/**", async (route) => {
    await route.fulfill({
      json: {
        server_time: now,
        patient_id: patientId,
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
  await expect(page).toHaveURL(/(?<!login)\/patient$/);

  await seedOfflineData(page);
  await openRoutineFromPatientHome(page);
  await expect(page.getByText("Morning tablet")).toBeVisible();
  await expect
    .poll(
      () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      { timeout: 30_000 },
    )
    .toBe(true);
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
  const local = {
    outbox: await readEncryptedRecords(page, "outbox"),
    responses: await readEncryptedRecords(page, "reminderResponses"),
    sessions: await readEncryptedRecords(page, "gameSessions"),
  };
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
        `reminder_response:${String(reminderResponse?.objectId)}`,
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
      `reminder_response:${String(reminderResponse?.objectId)}`,
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
