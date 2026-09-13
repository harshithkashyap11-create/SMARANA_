# T010 — JWT auth: professional login, refresh, logout, /auth/me

**Phase:** 1 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T006

## Read first
- `docs/04-api-contract.md (Auth)`
- `docs/02-architecture.md (Security baseline)`

## Touches
- `backend/apps/accounts`

## Goal
Email/phone + password login for caregivers/doctors/admins with approval gate, rotating refresh tokens, and a `/auth/me` endpoint.

## Scope (do exactly this)
- SimpleJWT: access 15m, refresh 7d, rotation + blacklist. `DeviceSession` model recording `device_id`, `refresh_token_jti`, `last_seen_at`.
- `POST auth/login/` accepts `email_or_phone`; unapproved doctor/caregiver → 403 `code=awaiting_approval`; wrong creds → 401 `code=credentials_not_verified` (same message for unknown user).
- `POST auth/refresh/`, `POST auth/logout/` (blacklist), `GET auth/me/` returning user, role, preferences, and assignment summary (patients' ids+names for caregiver/doctor).
- `PATCH auth/me/preferences/`.
- Audit `login` / `login_failed` events.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Patient PIN login (T011).
- MFA.

## Acceptance criteria
- [ ] Tests: approved caregiver logs in; unapproved doctor gets awaiting_approval; wrong password and unknown email return identical bodies; refresh rotates and old refresh is rejected; `/auth/me` shape matches contract.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
