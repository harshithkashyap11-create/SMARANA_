# T111 — Printable emergency card and print styles

**Phase:** 10 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T110

## Read first
- `docs/01-scope-and-mvp.md`

## Touches
- `backend/apps/reports`
- `frontend/src/features/caregiver`

## Goal
One-page emergency card: essentials, medications, allergies (field added to baseline), contacts.

## Scope (do exactly this)
- Template + endpoint + button; print CSS for caregiver pages.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] PDF contains contacts and medications.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
