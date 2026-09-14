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

## Assumptions made (review with mentor)
- PostgreSQL and Redis are internal-only Compose services to avoid conflicting with host development databases; application and MinIO ports remain exposed.

## Known issues / tech debt
- Pin container and language dependency versions with lock files as the backend/frontend toolchains are completed in later foundation tasks.

## Next up
- T003
