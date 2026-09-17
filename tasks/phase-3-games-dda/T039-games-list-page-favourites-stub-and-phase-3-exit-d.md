# T039 — Games list page, favourites stub, and Phase 3 exit demo script

**Phase:** 3 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T034, T037, T038, T035, T036

## Read first
- `docs/06-roadmap.md (Phase 3 exit)`

## Touches
- `frontend/src/features/patient/games`
- `docs/demo-scripts/phase3.md (new)`

## Goal
Polished games list with challenge toggle and a written demo script that the mentor follows.

## Scope (do exactly this)
- Games list: tiles with regional badge, challenge toggle, 'Continue' card if resume state.
- `docs/demo-scripts/phase3.md`: exact steps to show demote/promote/challenge/break with expected DB rows.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Mentor runs the script successfully.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
