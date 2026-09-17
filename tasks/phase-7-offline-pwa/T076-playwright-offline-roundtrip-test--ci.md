# T076 — Playwright offline round-trip test + CI

**Phase:** 7 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T072, T073, T074

## Read first
- `docs/09-offline-sync-spec.md (Test plan)`

## Touches
- `frontend/e2e/offline.spec.ts`
- `.github/workflows/ci.yml`

## Goal
The definitive offline test runs in CI.

## Scope (do exactly this)
- Spec per the test plan; assert via API that GameSession and ReminderResponse exist with client UUIDs; replay push → no duplicates.
- CI job with compose services and Playwright browsers cached; runtime < 10 min.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] CI green with the offline spec included.

## Verification
```
cd frontend && npx playwright test e2e/offline.spec.ts
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
