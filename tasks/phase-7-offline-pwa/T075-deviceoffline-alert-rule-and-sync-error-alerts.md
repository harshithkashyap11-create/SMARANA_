# T075 — Device-offline alert rule and sync error alerts

**Phase:** 7 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T044, T071

## Read first
- `docs/09-offline-sync-spec.md (Caregiver visibility)`

## Touches
- `backend/apps/alerts/rules.py`

## Goal
`device_offline_3d` (attention) and `sync_error` (info, from dead-lettered items) alerts to caregivers, never to patients.

## Scope (do exactly this)
- Two rules + Beat evaluation; explanation includes last seen time.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Rule tests with freezegun; dead-letter → alert.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
