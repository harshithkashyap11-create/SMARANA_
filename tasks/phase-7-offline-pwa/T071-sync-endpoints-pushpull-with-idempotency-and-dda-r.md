# T071 — Sync endpoints (push/pull) with idempotency and DDA reconciliation + client sync engine

**Phase:** 7 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T070, T031

## Read first
- `docs/09-offline-sync-spec.md`
- `docs/04-api-contract.md (Sync)`

## Touches
- `backend/apps/sync`
- `frontend/src/db/sync.ts`

## Goal
The full push/pull loop with allowlist, per-item validation, idempotency, server-side DDA recompute, and client triggers.

## Scope (do exactly this)
- Backend: `POST sync/push/`, `GET sync/pull/?since=`, `IdempotencyRecord`, `SYNC_MODELS`; sessions processed before difficulty; `dda_mismatch` warning logged; `DeviceSession.last_seen_at` updated.
- Frontend `sync.ts`: `pushOutbox` then `pull`; triggers (foreground, online, 5-min timer, post-write when online); `lastPullAt` from server_time; dead-letter handling; `OfflineChip` and 'Progress shared with {caregiver}' toast.
- Reminders in pull cover 3 days; missing ones generated locally via uuid5 (TS impl + shared cases test).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Service worker (T072).
- Background Sync API.

## Acceptance criteria
- [ ] Backend tests: replay same batch → no duplicates; foreign patient item → rejected+audited; wrong model → rejected; DDA recomputed.
- [ ] Vitest: sync loop with fake fetch processes outbox and updates lastPullAt from server_time; reminder ids match shared cases.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
