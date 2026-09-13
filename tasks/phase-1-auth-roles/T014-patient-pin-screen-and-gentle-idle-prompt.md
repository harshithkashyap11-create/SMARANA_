# T014 — Patient PIN screen and gentle idle prompt

**Phase:** 1 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T011, T013

## Read first
- `docs/05-user-stories.md (A1, A5)`
- `docs/14-design-system.md`

## Touches
- `frontend/src/features/auth`
- `frontend/src/shared/ui/Keypad.tsx`

## Goal
On-screen keypad PIN login for patients with remembered login id, lock-state copy, and a 30-minute 'Are you still there?' prompt.

## Scope (do exactly this)
- `Keypad` component (digits 0–9, backspace, ≥64px keys, TTS-ready labels). `/login/patient`: login id pre-filled from last successful login (Dexie `meta`), 4 dots, auto-submit on 4th digit.
- Error copy `auth.pin_no_match`; locked copy `auth.locked_caregiver_told` with caregiver name if known.
- `PatientLayout`: top bar (back, title, Talk placeholder), bottom nav (Home, Play, Wellness, Family, Settings — fixed order), `useIdlePrompt(30min)` showing a big 'Yes, I'm here' `ConfirmDialog`.
- `ConfirmDialog` shared component (big Yes/No, optional TTS hook stub).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Offline PIN verification (T073).

## Acceptance criteria
- [ ] Vitest: 4 digits triggers submit; lock state shows the right copy; keypad keys ≥64px.
- [ ] Manual: login as RAO1234/1234 lands on placeholder Home with bottom nav.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
