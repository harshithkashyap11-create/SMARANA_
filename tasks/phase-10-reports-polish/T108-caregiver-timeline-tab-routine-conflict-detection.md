# T108 — Caregiver Timeline tab, routine conflict detection, Care Team tab

**Phase:** 10 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T046, T042

## Read first
- `docs/05-user-stories.md (G5, C2)`

## Touches
- `backend/apps/patients/timeline.py`
- `frontend/src/features/caregiver`

## Goal
Chronological master log; overlapping routine items warned before save; care team list with contacts.

## Scope (do exactly this)
- `GET patients/{id}/timeline/?from=&to=` merging sessions, responses, notes, alerts, SOS, DDA changes, assignments.
- Conflict detection service (same time ± 10 min) returning warnings; UI confirm.
- Care Team tab with single-tap call/email.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Timeline ordering and permission tests; conflict tests.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
