# T109 — Remaining alert rules and notification preferences

**Phase:** 10 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T044, T106

## Read first
- `docs/03-data-model.md (alerts)`

## Touches
- `backend/apps/alerts`

## Goal
`reaction_time_worsening`, `engagement_drop`, per-user channel preferences (in-app/email; push/SMS as disabled options), caregiver 'Are you okay?' check-in.

## Scope (do exactly this)
- Rules with clear thresholds and explanations; `NotificationPreference` CRUD; check-in creates a patient-visible prompt answered by big button (sync push model `checkin_response`).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [x] Rule tests; preference respected in notify.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [x] `/review-task` verdict READY
- [x] `/finish-task` run (PROGRESS.md updated, committed)

Evidence and review: `docs/reviews/T109-T112.md`.
