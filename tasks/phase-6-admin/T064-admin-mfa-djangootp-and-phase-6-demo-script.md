# T064 — Admin MFA (django-otp) and Phase 6 demo script

**Phase:** 6 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T060

## Read first
- `docs/02-architecture.md (Security baseline)`

## Touches
- `backend/config`
- `docs/demo-scripts/phase6.md`

## Goal
TOTP required for admin site login; demo script.

## Scope (do exactly this)
- django-otp + `OTPAdminSite`; setup flow documented in README; seed_demo prints a dev TOTP secret.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Admin login without OTP is rejected; demo script runs.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
