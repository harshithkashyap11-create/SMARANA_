# T040 — Caregiver portal shell: patient switcher, Today tab with routine + medicine adherence

**Phase:** 4 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T013, T023, T024

## Read first
- `docs/05-user-stories.md (G1, C4)`
- `docs/04-api-contract.md`

## Touches
- `frontend/src/features/caregiver`
- `backend/apps/routines (adherence summary)`

## Goal
Caregiver layout with tabs (Today, Progress, Alerts, Schedule, Memories, Reports, Care Team) and a working Today tab.

## Scope (do exactly this)
- Backend `GET patients/{id}/adherence/?days=7` → per-day medicine reminders with statuses + summary counts (caregiver, doctor).
- Frontend: patient switcher (dropdown of assigned patients with primary badge), tab nav, Today tab: today's reminders with status chips and response times, 7-day adherence strip, 'Last synced' from `DeviceSession.last_seen_at` (expose in patient card).
- Tabs other than Today render a 'Coming in this phase' placeholder.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Editing (T042).

## Acceptance criteria
- [ ] Vitest: switcher changes the active patient in URL/state; Today shows chips per status.
- [ ] Backend tests for adherence + permissions.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
