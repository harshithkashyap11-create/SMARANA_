# T027 — Memory quiz patient UI with supportive feedback

**Phase:** 2 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T026, T024

## Read first
- `docs/05-user-stories.md (E3)`
- `docs/14-design-system.md`

## Touches
- `frontend/src/features/patient/memories/quiz`

## Goal
Photo + question + 3 large options; correct → celebration; incorrect → 'This is saved as {label}' with no red; break prompt on repeated struggle.

## Scope (do exactly this)
- `OptionGrid` shared component (2–4 options, photo or text, ≥64px).
- Quiz flow: fetch next → answer → feedback screen (2s) → next; 'That's enough for today' button always visible.
- Simple struggle detection: 3 incorrect in a row or 3 answers under 700ms in a row → `BreakPrompt` ('Would you like a short break?').
- Attempts recorded via repo (local write then POST).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- DDA for quiz (not applicable).

## Acceptance criteria
- [ ] Vitest: incorrect shows `quiz.saved_as` with label; 3 incorrect → BreakPrompt; no element with red token.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
