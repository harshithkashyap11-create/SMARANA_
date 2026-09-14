# PROGRESS

Update this file at the end of every task (`/finish-task` does it). Keep it short. This is the memory Claude Code reads at the start of each session.

## Current phase
Phase 0 — Foundation

## In flight
- None

## Done
| Task | Date | Commit | Notes |
|---|---|---|---|
| T001 | 2026-09-14 | `feat(foundation): T001 repository skeleton and Docker Compose` | Compose development stack, Make targets, and minimal backend/frontend bootstraps. |
| T002 | 2026-09-14 | `feat(backend): T002 Django foundation and custom user` | Split environment settings, shared backend primitives, custom role-based user, admin registration, and database-aware health endpoint. |
| T003 | 2026-09-14 | `feat(frontend): T003 React PWA foundation and design tokens` | React PWA shell, accessible UI primitives, theme scaling, aligned locale catalogs, health status, and frontend test tooling. |
| T004 | 2026-09-14 | `ci: T004 mirror local verification in GitHub Actions` | GitHub Actions runs cached backend and frontend verification with PostgreSQL and Redis services on pushes and pull requests. |

## Assumptions made (review with mentor)
- PostgreSQL and Redis are internal-only Compose services to avoid conflicting with host development databases; application and MinIO ports remain exposed.
- Assamese and Bengali catalogs mirror the English keys with `TODO:` values until translated content is supplied.

## Known issues / tech debt
- Pin container and language dependency versions with lock files as the backend/frontend toolchains are completed in later foundation tasks.
- React Router remains on the project-mandated v6 line; npm reports two moderate advisories whose available fix upgrades to v7, so migration should be handled as a separate compatibility task.
- Replace the placeholder SVG PWA artwork with final install icons before release.
- `renderWithProviders` currently accepts a generic repository map; tighten it to concrete repository interfaces as offline repositories are introduced.

## Next up
- T005
