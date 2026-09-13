# T093 — Patient setup: region, language, cultural background selection (caregiver + first-run)

**Phase:** 9 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T091, T020

## Read first
- `docs/05-user-stories.md (L1)`

## Touches
- `frontend/src/features/caregiver/profile`
- `frontend/src/features/patient/settings`

## Goal
Region and cultural preferences selectable by caregiver (and shown to patient), driving pack selection.

## Scope (do exactly this)
- Caregiver profile editor for region/cultural_notes/language; patient settings shows region read-only.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Vitest: changing region triggers pack reload.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
