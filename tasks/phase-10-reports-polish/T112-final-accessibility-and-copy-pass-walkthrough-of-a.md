# T112 — Final accessibility and copy pass, walkthrough of all demo scripts

**Phase:** 10 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T104, T107, T110

## Read first
- `docs/14-design-system.md`
- `.claude/skills/react-frontend/references/accessibility-checklist.md`

## Touches
- `frontend/src`

## Goal
Run the checklist on every patient screen at 360px and font scale 1.6 in both themes; fix findings; run all demo scripts.

## Scope (do exactly this)
- Automated: axe-core in Playwright for patient routes; manual list of fixes in PROGRESS.md.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] axe passes with no serious violations; all demo scripts pass.

## Verification
```
cd frontend && npx playwright test e2e/a11y.spec.ts
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
