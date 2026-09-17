# T029 — Emergency SOS: patient long-press + backend event + caregiver in-app notification

**Phase:** 2 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T011, T021

## Read first
- `docs/05-user-stories.md (E5)`
- `docs/03-data-model.md (alerts)`
- `docs/04-api-contract.md (SOS)`

## Touches
- `backend/apps/alerts`
- `frontend/src/features/patient/sos`

## Goal
A persistent SOS button (long-press 2s + confirm) that creates an `SosEvent`, raises a high-severity `Alert` to all assigned caregivers, and can be acknowledged.

## Scope (do exactly this)
- Backend `POST patients/{id}/sos/` (idempotent) → `SosEvent` + `Alert(rule_key='sos', severity='high')` + `notified` JSON (in_app now; email in T045); `POST sos/{id}/acknowledge/` for assigned caregivers.
- Frontend `SosButton` in `PatientLayout` (amber, bottom-right, long-press with progress ring, then ConfirmDialog with TTS). After sending: calm confirmation screen 'Priya has been told. Help is on the way.' with call buttons for emergency contacts.
- Never trigger from voice without confirmation (documented in code comment for T081).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Push/SMS.

## Acceptance criteria
- [ ] Tests: patient creates SOS; same idempotency_key twice → one event; unassigned caregiver ack → 404; alert exists for each assigned caregiver (or one alert with recipients — choose and document).
- [ ] Vitest: short press does nothing; long-press + confirm calls repo.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
