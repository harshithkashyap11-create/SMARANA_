# PROGRESS

Update this file at the end of every task (`/finish-task` does it). Keep it short. This is the memory Claude Code reads at the start of each session.

## Current phase
Phase 2 — Patient core

## In flight
- None.

## Done
| Task | Date | Commit | Notes |
|---|---|---|---|
| T001 | 2026-09-14 | `feat(foundation): T001 repository skeleton and Docker Compose` | Compose development stack, Make targets, and minimal backend/frontend bootstraps. |
| T002 | 2026-09-14 | `feat(backend): T002 Django foundation and custom user` | Split environment settings, shared backend primitives, custom role-based user, admin registration, and database-aware health endpoint. |
| T003 | 2026-09-14 | `feat(frontend): T003 React PWA foundation and design tokens` | React PWA shell, accessible UI primitives, theme scaling, aligned locale catalogs, health status, and frontend test tooling. |
| T004 | 2026-09-14 | `ci: T004 mirror local verification in GitHub Actions` | GitHub Actions runs cached backend and frontend verification with PostgreSQL and Redis services on pushes and pull requests. |
| T005 | 2026-09-14 | `feat(api): T005 generate OpenAPI client` | Public OpenAPI schema, deterministic Orval client generation, bearer/refresh mutator, and generated health client integration. |
| T006 | 2026-09-14 | `feat(testing): T006 add reusable care scenario and demo seed` | Minimal patient assignment models, reusable role factories and fixtures, frozen time, and idempotent demo accounts. |
| T010 | 2026-09-14 | `feat(auth): T010 add professional JWT authentication` | Approval-gated professional login, rotating device-bound refresh tokens, logout, self context, preferences, and generated API contracts. |
| T011 | 2026-09-14 | `feat(auth): T011 add patient PIN login and lockout alerts` | Argon2 patient PIN login, 30-day device sessions, timed lockout with deduplicated caregiver alerts, and primary-caregiver PIN reset. |
| T012 | 2026-09-14 | `feat(patients): T012 add assignment-scoped patient reads` | Completed assignment history fields, role-scoped patient selectors, and read-only patient list/detail API contracts. |
| T013 | 2026-09-14 | `test(frontend): complete T013 browser login coverage` | Landing page, professional login, role routing, auth store, professional idle logout, and Playwright role-guard coverage. |
| T014 | 2026-09-14 | `feat(frontend): T014 add patient PIN login and idle prompt` | Remembered patient login ID, large keypad, gentle lock copy, patient shell, and 30-minute presence prompt. |
| T015 | 2026-09-14 | `feat(phase-1): complete T015 language preferences and T016 audit trail` | Native-language tiles, persisted en/as/bn selection, Bengali font bundle, and synchronized account preference support. |
| T016 | 2026-09-14 | `feat(phase-1): complete T015 language preferences and T016 audit trail` | Append-only audit app covers login success/failure and preference updates, with read-only admin visibility. |
| T020 | 2026-09-14 | `feat(patients): T020 add life-history, family, and consent APIs` | Full patient profile fields, role-scoped updates, family CRUD with signed media, consent controls, and audited changes. |

## Assumptions made (review with mentor)
- PostgreSQL and Redis are internal-only Compose services to avoid conflicting with host development databases; application and MinIO ports remain exposed.
- Assamese and Bengali catalogs mirror the English keys with `TODO:` values until translated content is supplied.
- T012 returns nullable patient-card age and language until T020 adds date of birth and the later preferences/content work establishes the persisted language source.
- Patient region is stored as a stable string key until T090 introduces the `content.Region` model.

## Known issues / tech debt
- Pin container and language dependency versions with lock files as the backend/frontend toolchains are completed in later foundation tasks.
- React Router remains on the project-mandated v6 line; npm reports two moderate advisories whose available fix upgrades to v7, so migration should be handled as a separate compatibility task.
- Replace the placeholder SVG PWA artwork with final install icons before release.
- `renderWithProviders` currently accepts a generic repository map; tighten it to concrete repository interfaces as offline repositories are introduced.
- T014's minimal Dexie `meta` store now also persists the language selection. IndexedDB is deliberately treated as optional during SSR and unit tests.

## Next up
- T021 — Patient home tiles, bottom nav, and daily orientation card.
