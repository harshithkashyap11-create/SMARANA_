# T056 — Phase 5 exit demo script and doctor session security (timeouts, password rules)

**Phase:** 5 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T050, T051, T052, T053, T054, T055

## Read first
- `docs/02-architecture.md (Security baseline)`

## Touches
- `backend/config/settings`
- `docs/demo-scripts/phase5.md`

## Goal
Password validators (min 12), professional idle timeout enforced, and the written demo.

## Scope (do exactly this)
- Django password validators; access token lifetime check; `useIdleLogout` verified for doctor layout.
- `docs/demo-scripts/phase5.md`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Mentor runs the script.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
