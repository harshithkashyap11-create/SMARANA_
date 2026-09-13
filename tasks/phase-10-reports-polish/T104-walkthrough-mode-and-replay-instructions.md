# T104 — Walkthrough mode and Replay Instructions

**Phase:** 10 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T082

## Read first
- `docs/10-voice-assistant-spec.md (Walkthrough)`
- `docs/05-user-stories.md (B4)`

## Touches
- `frontend/src/features/patient/walkthrough`

## Goal
First visit to each section speaks/shows a one-line explanation once; `SectionHeader` gets a Replay button.

## Scope (do exactly this)
- `meta.walkthroughSeen`; copy keys `walkthrough.<section>`; TTS + large text overlay with 'Got it'.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Vitest: shown once, replay shows again.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
