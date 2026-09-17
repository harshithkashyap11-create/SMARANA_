# T060 — Django Admin: approval workflow for doctors and caregivers

**Phase:** 6 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T010, T016

## Read first
- `docs/01-scope-and-mvp.md (Admin)`
- `docs/05-user-stories.md (I1)`

## Touches
- `backend/apps/accounts/admin.py`

## Goal
Admins approve/deactivate professional accounts from Django Admin with verification status and audit; unapproved users cannot log in.

## Scope (do exactly this)
- `UserAdmin` customised: list filters by role/approval; actions 'Approve selected', 'Deactivate'; `DoctorProfile` inline with `verification_status` (default `demo_verified` for prototypes, never `verified` without a note).
- Admin cannot see password hashes or PINs (remove fields); deactivation is soft.
- Audit `approve`/`deactivate` actions with actor.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- React admin.

## Acceptance criteria
- [ ] Tests: admin action approves and audits; deactivated user login → 401 generic; admin change form has no pin/password fields.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
