# T004 — CI pipeline (GitHub Actions) mirroring local verification

**Phase:** 0 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T002, T003

## Read first
- `docs/12-testing-and-dod.md`

## Touches
- `.github/workflows/ci.yml`

## Goal
CI runs the same commands as CLAUDE.md on every push and PR.

## Scope (do exactly this)
- Jobs: backend (postgres + redis services, ruff, mypy on services, pytest), frontend (lint, typecheck, vitest, i18n:check).
- Cache pip and npm. Fail on warnings from ruff.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Deploy jobs.
- Playwright in CI (added in T076).

## Acceptance criteria
- [ ] A PR with a failing test shows red; green otherwise.

## Verification
```
cat .github/workflows/ci.yml
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
