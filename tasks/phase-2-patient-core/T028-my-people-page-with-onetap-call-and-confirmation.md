# T028 — My People page with one-tap call and confirmation

**Phase:** 2 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T020, T021

## Read first
- `docs/05-user-stories.md (E4)`

## Touches
- `frontend/src/features/patient/people`

## Goal
Family cards (photo, name, relationship in patient's language) → 'Call Priya?' → `tel:`.

## Scope (do exactly this)
- Cards from `db/repo/patient.ts` familyMembers; emergency contacts first.
- `ConfirmDialog` with TTS 'Call Priya?'; Yes → `window.location.href = tel:`; audit-free (client only).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- In-app calling.

## Acceptance criteria
- [ ] Vitest: tapping card opens confirm; confirm sets location to tel: link (mock).

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
