# T023b — Calm Time: guided breathing with slow voice

**Phase:** 2 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T021

## Read first
- `docs/05-user-stories.md (F1)`
- `docs/14-design-system.md`

## Touches
- `frontend/src/features/patient/calm`
- `frontend/src/shared/hooks/useTts.ts`

## Goal
A breathing exercise screen (4-4-6 pattern, 5 cycles default) with a growing/shrinking circle, text cues, and TTS at slow rate.

## Scope (do exactly this)
- `useTts(text, {rate})` wrapper over `speechSynthesis` with a fake for tests; reads `accessibility.slow_speech` → rate 0.7.
- Calm page: Start/Stop big buttons, reduced-motion fallback (text-only cues), 'Play again' at the end, no timers shown as numbers.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Audio tracks / soothing prompts (v1).

## Acceptance criteria
- [ ] Vitest with fake TTS: cues spoken in order; reduced-motion renders no animation class.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
