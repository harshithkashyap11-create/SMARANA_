# T070 — Dexie schema, outbox, and repo migration for all patient features

**Phase:** 7 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T024, T027, T030

## Read first
- `docs/09-offline-sync-spec.md`
- `.claude/skills/offline-sync/SKILL.md`

## Touches
- `frontend/src/db`

## Goal
Every patient-created write goes through the outbox in one transaction; every patient read is Dexie-first.

## Scope (do exactly this)
- Full `db/schema.ts` tables per spec; `outbox.ts` (`enqueue`, `nextBatch`, `markAccepted`, `markRejected`, backoff).
- Refactor `repo/routine.ts`, `repo/games.ts`, `repo/memories.ts` (quiz attempts), `repo/patient.ts` (mood/sleep later) to write locally + enqueue instead of direct POST.
- `VITE_FAKE_OFFLINE=1` dev flag to simulate no network.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Sync engine (T071).
- Backend endpoints (T071).

## Acceptance criteria
- [ ] Vitest: respond/reminder writes both tables in one transaction (fails atomically); nextBatch respects backoff; UI shows 'Saved safely on this device' immediately.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
