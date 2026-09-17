# T045 — Alerts tab (caregiver) + email delivery for SOS and high-severity alerts

**Phase:** 4 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T044, T029, T040

## Read first
- `docs/05-user-stories.md (G2, E5)`

## Touches
- `frontend/src/features/caregiver/alerts`
- `backend/apps/alerts/notify.py`

## Goal
Caregivers see explained alerts, acknowledge with a note, forward to doctor; SOS and high alerts also send email.

## Scope (do exactly this)
- Backend `notify.py` with a `Channel` interface (`InApp`, `Email` via Django email backend; console in dev); SOS + high severity → email to assigned caregivers; `notified` JSON updated.
- Frontend Alerts tab: cards grouped open/acknowledged; explanation, timestamp, evidence links (to session or reminder); actions; SOS banner at top when open.
- Simple polling every 30s while the tab is open (WebSockets are v2).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Push/SMS.

## Acceptance criteria
- [ ] Tests: SOS sends one email per caregiver (locmem backend); ack updates status and audits.
- [ ] Vitest: forward action disabled when no doctor assigned.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
