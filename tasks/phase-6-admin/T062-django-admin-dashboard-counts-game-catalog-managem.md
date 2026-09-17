# T062 — Django Admin: dashboard counts, game catalog management, security actions

**Phase:** 6 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T060, T030

## Read first
- `docs/05-user-stories.md (I3)`

## Touches
- `backend/apps/admin_portal (new: custom AdminSite index)`
- `backend/apps/games/admin.py`

## Goal
Admin index shows live counts; game catalog enable/disable and global caps; force logout / lock account / trigger PIN reset actions.

## Scope (do exactly this)
- Custom `AdminSite.index` template with counts (users by role, active 7d, pending approvals, open assignments, open SOS, devices unsynced >72h) from queries.
- `GameDefinitionAdmin`: enable/disable, max_level cap, regions; forbid per-patient difficulty edits (no DifficultyState admin edit; read-only).
- User actions: force logout (blacklist refresh tokens), lock account, send PIN reset request to primary caregiver (creates an alert).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- System health page.
- Analytics.

## Acceptance criteria
- [ ] Tests: counts match seeded data; disabling a game removes it from `GET games/`; force logout invalidates refresh.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
