# T021 — Patient Home: tiles, bottom nav, and Daily Orientation Card (online)

**Phase:** 2 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T014, T020

## Read first
- `docs/05-user-stories.md (B1, B2)`
- `docs/14-design-system.md`
- `docs/04-api-contract.md (orientation)`

## Touches
- `backend/apps/patients (orientation endpoint)`
- `frontend/src/features/patient/home`

## Goal
The home screen from the spec's screenshot: greeting, orientation card, 8 icon tiles, fixed bottom nav.

## Scope (do exactly this)
- Backend `GET patients/{id}/orientation/` computing greeting (by hour, in patient's language on the client — return `greeting_key`), day, date, time, `home_label`, next `Reminder` today, one `FamilyMember` photo (rotating daily, deterministic).
- Frontend `OrientationCard` (≥22px text, family photo, next activity). `IconTile` grid: Games, Medicines, Sleep, Memories, Calm, My people, Progress, Today's routine — routes to placeholder pages that exist.
- `db/repo/patient.ts` read-through repo (Dexie `profile`, `familyMembers` tables) — network refresh when online; this is the first repo, establish the pattern.
- Greeting uses `t('home.greeting_morning', {name})` etc.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Offline generation of orientation (T072) — but the repo pattern must make it trivial.

## Acceptance criteria
- [ ] Vitest: orientation renders next activity and photo; empty next activity shows friendly copy; tiles count = 8 in fixed order.
- [ ] Manual at 360px and font scale 1.6: no horizontal scroll.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
cd frontend && npm run i18n:check
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
