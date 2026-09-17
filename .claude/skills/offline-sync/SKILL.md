---
name: offline-sync
description: How Smārana's offline-first storage and sync work (Dexie/IndexedDB, outbox, idempotency, pull/push, service worker). Use this whenever a task touches anything the patient does offline — saving reminder responses, game sessions, quiz attempts, DDA state, offline login, reminder generation, resume state, the sync engine, or the backend sync endpoints — or whenever you're unsure whether data should be read from the network or from local storage.
---

# Offline & sync

Spec: `docs/09-offline-sync-spec.md` (read it for any sync task). This skill is the working summary.

## Mental model
- The patient device is a **replica** of the patient's slice of the server. Server-owned data (routine, medications, memories, family, content) flows **down** via `GET /sync/pull`. Patient-created data flows **up** via `POST /sync/push` from an **outbox**.
- Every patient-created record has a client-generated UUID `id` and `idempotency_key = "{model}:{id}:{deviceUpdatedAtMs}"`. Retries are safe because the server upserts by `id` and dedupes by key.

## Client rules
1. Write UI data and outbox entry in **one Dexie transaction**:
   ```ts
   await db.transaction('rw', db.reminderResponses, db.outbox, async () => {
     await db.reminderResponses.put(rec);
     await db.outbox.add({ id: uuid(), model: 'reminder_response', objectId: rec.id, payload: rec, idempotencyKey: key(rec), createdAt: Date.now(), attempts: 0 });
   });
   ```
2. Show "Saved safely on this device." immediately.
3. `sync.ts` runs `pushOutbox()` then `pull()` on: foreground, `online`, timer (5 min), after outbox writes when online.
4. `lastPullAt` is **always** the `server_time` from the last response, never `Date.now()`.
5. Reminders missing locally for a date are generated from `routineItems` with `uuid5(NS, `${routineItemId}:${date}`)` — identical to the server.
6. Never read patient data straight from the API in patient features; go through `db/repo/*`.

## Server rules
- `SYNC_MODELS` allowlist in `apps/sync/services.py`. Anything else → rejected `forbidden` + audit.
- Validate `item.data.patient == request.user.patient_id` for every item.
- Upsert order inside a batch: `GameSession` before `DifficultyState` (server recomputes DDA from sessions and overrides client state; log `dda_mismatch` if different).
- Return `{accepted, rejected, server_time}`; rejected items carry a `code` the client uses to decide dead-letter vs retry.

## Service worker
- Precache app shell + fonts. Runtime: media CacheFirst, content pack SWR, everything else NetworkOnly. Never cache POST or professional-role API responses.

## Testing
- Unit: outbox write/transaction, backoff schedule, reminder id generation (Python and TS must produce identical UUIDs — add a case to `shared/reminder_id_cases.json`).
- Playwright `e2e/offline.spec.ts`: the full round trip from the spec. Assert no duplicates after a second push with the same payload.

## Copy
Patient never sees "sync", "failed", counts, or errors. See design system.
