# 09 — Offline & Sync Spec

Goal: **the patient portal works with no network** for everything on the home screen. Caregiver/doctor portals are online-first (v1: read-only cache of last data).

## Client storage (Dexie / IndexedDB)

Tables (mirror server models; all keyed by UUID `id`):
`profile, familyMembers, routineItems, reminders, reminderResponses, medications, memories, memoryMedia (metadata only; blobs in Cache Storage), memoryQuizAttempts, gameDefinitions, difficultyStates, difficultyChanges, gameSessions, sleepLogs, moodLogs, sosEvents, contentPacks, outbox, meta`.

`meta` holds: `lastPullAt`, `deviceId`, `patientId`, `pinVerifier` (Argon2/PBKDF2 hash of PIN, salted, for offline unlock), `refreshTokenEncrypted`, `resumeState`.

## Outbox pattern

Every offline-created record is written **twice** in one Dexie transaction: to its table (optimistic UI) and to `outbox` as `{id, model, objectId, payload, idempotencyKey, createdAt, attempts, lastError}`.

The sync engine:
1. Triggers on: app foreground, `online` event, after any outbox write when online, every 5 minutes while open, and (v1) Background Sync API.
2. Reads outbox in `createdAt` order, batches ≤ 50, `POST /sync/push`.
3. On `accepted` → delete from outbox. On `rejected` with a permanent code (`validation`, `forbidden`) → move to `outboxDead` and surface to caregiver via a `sync_error` alert (patient never sees this). On network error → keep, exponential backoff (1m, 5m, 30m, cap 6h).
4. Then `GET /sync/pull?since=lastPullAt` and upsert everything; update `lastPullAt = server_time` from the response (never client clock).

## Idempotency (server)

- Client generates `idempotency_key = "{model}:{id}:{device_updated_at_ms}"`.
- Server: `IdempotencyRecord` unique on key. Upsert by `id`. If a record with same `id` exists and incoming `device_updated_at` is older → ignore (return accepted). This makes retries and duplicate submissions harmless.
- Models allowed in `push`: `ReminderResponse, GameSession, DifficultyState, DifficultyChange, MemoryQuizAttempt, SleepLog, MoodLog, SosEvent, MoodLog`. Nothing else — the patient device cannot create routine items, memories, etc.
- Server validates `patient == request.user.patient` for every item; mismatches are rejected with `forbidden` and audited.

## Conflict rules

| Record | Rule |
|---|---|
| `ReminderResponse` | Append-only; multiple responses to one reminder are fine; reminder `status` = latest by `responded_at`. |
| `GameSession` | Append-only. |
| `DifficultyState` | **Server recomputes** DDA from sessions on push; server value wins; client overwritten on next pull. Log a `dda_mismatch` warning if the client's level differs. |
| `RoutineItem`, `Medication`, `Memory`, `FamilyMember` | Server-owned; pull only. |
| `SosEvent` | Append-only; also attempts immediate direct POST bypassing batch when online. |

## Offline reminders

Reminders for the next 3 days are pulled. If the device is offline longer, the client generates reminders from `routineItems` using the **same deterministic id**: `uuid5(SMARANA_NS, `${routineItemId}:${YYYY-MM-DD}`)`. The server uses the same formula, so responses always attach to the right reminder.

## Offline auth

- On successful online patient login, store `pinVerifier` and encrypted refresh token (WebCrypto, key derived from PIN).
- Offline PIN screen verifies locally; 5 failures → local 15-minute lock (same UX).
- When back online, refresh token exchange happens silently; if revoked → force online login.

## Service worker (vite-plugin-pwa / Workbox)

- Precache app shell (JS/CSS/HTML, fonts including Noto Sans Bengali).
- Runtime cache: `/media/*` images with CacheFirst (max 500 entries, 30 days); `/api/v1/content/pack` StaleWhileRevalidate; API GETs NetworkFirst with 3s timeout falling back to Dexie (handled in app code, not SW).
- Never cache POST. Never cache other roles' API responses in SW (roles use NetworkOnly for `/patients/` list endpoints).

## Reassuring copy (patient)

- On outbox write: "Saved safely on this device."
- After successful push: "Progress shared with Priya."  (name of primary caregiver)
- Offline banner: a small cloud icon with "Working offline" — no red, no exclamation.
- Never show: "sync failed", counts of pending items, error codes.

## Caregiver visibility

Caregiver dashboard shows `Last synced: 2 hours ago` and `Pending on device: yes/no` from `DeviceSession.last_seen_at` and the last push. Celery task raises `device_offline_3d` alert when `last_seen_at` > 72h.

## Test plan (T076)

Playwright: log in online → go offline (`context.setOffline(true)`) → respond to reminder, play a game → reload → verify data in IndexedDB and UI → go online → wait for sync → assert via API that `GameSession` and `ReminderResponse` exist with the same UUIDs → re-run push with same payload → assert no duplicates.
