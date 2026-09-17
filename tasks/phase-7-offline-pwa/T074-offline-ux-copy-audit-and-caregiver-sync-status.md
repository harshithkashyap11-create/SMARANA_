# T074 — Offline UX copy audit and caregiver sync status

**Phase:** 7 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T071, T040

## Read first
- `docs/09-offline-sync-spec.md (Copy, Caregiver visibility)`

## Touches
- `frontend/src`
- `backend/apps/patients`

## Goal
Patient never sees technical sync language; caregiver sees 'Last synced' and 'Pending on device'.

## Scope (do exactly this)
- Grep-based test: no strings 'sync', 'failed', 'error' in `features/patient/**` i18n usage (lint script `npm run copy:check`).
- Backend: `pending_on_device` flag on patient card = last push had rejected items or `last_seen_at` older than 24h; caregiver Today shows both.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] copy:check passes; card shows sync fields.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
cd frontend && npm run copy:check
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
