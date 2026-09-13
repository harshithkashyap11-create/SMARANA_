# Smārana Starter Kit — Mentor & Student Package

This folder is everything you need to turn the Smārana spec (an app for elderly people with memory loss in North-East India) into a project that can be built **one small task at a time** with Claude Code.

Nothing here is code. It is the *scaffolding around the code*: scope decisions, architecture, data model, user stories, a task backlog, and Claude Code skills that keep every session consistent.

## What's inside

| Path | What it is | Who reads it |
|---|---|---|
| `docs/00-mentor-playbook.md` | How to mentor this project and how to use Claude Code on a limited plan | Mentor first, then student |
| `docs/01-scope-and-mvp.md` | The 30-page spec cut down into tiers (MVP → v1 → v2) | Both |
| `docs/02-architecture.md` | Django + DRF + React PWA. Every big decision and why | Student + Claude Code |
| `docs/03-data-model.md` | All Django models, fields, relationships | Claude Code (backend tasks) |
| `docs/04-api-contract.md` | REST endpoints, request/response shapes | Claude Code (both sides) |
| `docs/05-user-stories.md` | Epics → stories → acceptance criteria | Both |
| `docs/06-roadmap.md` | 10 phases, what "done" means for each | Both |
| `docs/07-dda-spec.md` | Dynamic Difficulty Adjustment rules, precisely | Claude Code |
| `docs/08-games-catalog.md` | 12 games, each with mechanics, metrics, DDA knobs | Claude Code |
| `docs/09-offline-sync-spec.md` | IndexedDB outbox, idempotency, conflict rules | Claude Code |
| `docs/10-voice-assistant-spec.md` | Intents, STT/TTS, slow-speech, language lock | Claude Code |
| `docs/11-permissions-matrix.md` | Role × resource × action table | Claude Code |
| `docs/12-testing-and-dod.md` | Test strategy + Definition of Done | Both |
| `docs/13-regional-content.md` | Content model for 8 NE states + languages | Both |
| `docs/14-design-system.md` | Elderly-first UI rules (touch targets, contrast, copy tone) | Claude Code (frontend) |
| `CLAUDE.md` | Goes at the repo root. Claude Code reads it every session | Claude Code |
| `PROGRESS.md` | Living tracker; updated at the end of every task | Both |
| `shared/` | Cross-language test vectors (starter DDA cases) | Claude Code |
| `docs/15-student-quickstart.md` | The 1-page version for the student | Student |
| `.claude/skills/*` | Claude Code skills: workflow (`/start-task`, `/finish-task`, `/review-task`, `/handoff`) and domain knowledge (backend, frontend, offline, DDA, games, testing) | Claude Code |
| `tasks/` | 83 task cards, each sized for one Claude Code session | Both |

## How to set the student up (10 minutes)

1. Create an empty git repo: `mkdir smarana && cd smarana && git init`.
2. Copy `CLAUDE.md`, `PROGRESS.md`, `.gitignore`, `docs/`, `tasks/`, `shared/`, and `.claude/` into the repo root. Commit: `git commit -m "chore: add project kit"`.
3. Student opens Claude Code in that folder and types `/start-task T001`.
4. Every task ends with `/finish-task`. Every session ends with `/handoff`.

That's the whole loop. Read `docs/00-mentor-playbook.md` for the reasoning and the guardrails.

## The rules that matter most

- **One task per session.** `/clear` between tasks. The task card is the prompt.
- **Plan before code.** Plan mode first, read the listed docs, then implement.
- **Tests are the definition of done.** No task closes without its verification commands passing.
- **Commit per task.** Small, reviewable diffs the mentor can read in 5 minutes.
- **The spec is not the backlog.** The backlog in `tasks/BACKLOG.md` is. New ideas go to `tasks/IDEAS.md`, not into the current task.
