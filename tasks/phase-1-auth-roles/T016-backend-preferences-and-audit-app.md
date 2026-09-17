# T016 — Backend preferences and audit app

**Phase:** 1 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T010

## Read first
- `docs/03-data-model.md (audit)`
- `docs/11-permissions-matrix.md (rule 6)`

## Touches
- `backend/apps/audit`
- `backend/apps/accounts`

## Goal
`apps/audit` with append-only `AuditEvent` and the `audit()` helper used by all later services; preferences persisted on `User`.

## Scope (do exactly this)
- `AuditEvent` model per data model; `save()` raises on update; no delete permission; Django Admin registration read-only with filters (actor, action, patient, date).
- `audit(actor, action, obj, patient=None, changes=None, request=None)` capturing ip/user-agent when request given.
- Wire audit into T010/T011 login flows and preferences update.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: audit rows are created for login, login_failed, preferences update; updating an AuditEvent raises; admin list view shows entries.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
