# T073 — Offline PIN unlock and encrypted refresh token

**Phase:** 7 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T071, T014

## Read first
- `docs/09-offline-sync-spec.md (Offline auth)`

## Touches
- `frontend/src/features/auth`
- `frontend/src/db/crypto.ts`

## Goal
Patients can unlock the app offline with their PIN; refresh token stored encrypted with a PIN-derived key; local lockout mirrors server.

## Scope (do exactly this)
- `crypto.ts`: PBKDF2(PIN, salt) → AES-GCM key; store `pinVerifier` and `refreshTokenEncrypted` in `meta` after online login.
- PIN screen: if offline (or server unreachable), verify locally; 5 failures → local 15-min lock; when online again, silent refresh; revoked → force online login and clear local secrets.
- Logout clears `meta` secrets and outbox is preserved (belongs to the patient).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Vitest: wrong PIN cannot decrypt; lockout timing; online login stores verifier.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
