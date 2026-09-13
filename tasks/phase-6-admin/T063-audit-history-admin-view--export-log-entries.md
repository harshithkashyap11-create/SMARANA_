# T063 — Audit history admin view + export log entries

**Phase:** 6 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T016, T060

## Read first
- `docs/11-permissions-matrix.md`

## Touches
- `backend/apps/audit/admin.py`

## Goal
Read-only, filterable audit browser and audit entries for admin exports.

## Scope (do exactly this)
- List with filters (actor, action, patient, date range), search, no add/change/delete permissions.
- Any Django Admin export action writes `export` audit rows.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: admin cannot change/delete audit rows via admin views (403).

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
