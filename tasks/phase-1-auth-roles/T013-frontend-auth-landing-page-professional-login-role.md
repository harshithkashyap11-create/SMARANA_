# T013 — Frontend auth: landing page, professional login, role routing, auth store

**Phase:** 1 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T003, T005, T010

## Read first
- `docs/05-user-stories.md (A2, A3)`
- `docs/14-design-system.md`

## Touches
- `frontend/src/features/auth`
- `frontend/src/app`

## Goal
Landing page with four role tiles; professional login form; `authStore`; router that sends each role to its (placeholder) layout.

## Scope (do exactly this)
- Landing route `/`: emblem placeholder, tagline key `landing.tagline`, 4 tiles (Patient first, prominent), language selector, theme + font-size controls in a settings row beneath.
- `/login/caregiver`, `/login/doctor`, `/login/admin` share one form; admin tile links to `/admin/` (Django Admin) instead. Errors mapped from `code` to i18n.
- `authStore` (Zustand): access token in memory, user, role; `api/client.ts` mutator attaches token and does refresh-on-401 once.
- `ProLayout` with header (user, logout) and a side/top nav placeholder; `PatientLayout` placeholder. Route guards by role; unauthorised → landing.
- `useIdleLogout(15min)` for professional layouts.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Patient PIN screen (T014).
- Real dashboards.

## Acceptance criteria
- [ ] Playwright `e2e/login.spec.ts`: seed_demo users log in as caregiver and doctor and see their layout; navigating to `/doctor` as caregiver redirects.
- [ ] Vitest: landing renders 4 tiles with ≥64px targets; login shows translated error on `awaiting_approval`.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
cd frontend && npx playwright test e2e/login.spec.ts
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
