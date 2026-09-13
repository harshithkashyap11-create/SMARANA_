---
name: start-task
description: Begin a Smārana task card. Use whenever the user types /start-task, says "start T0XX", "next task", "let's do task …", or opens a new session wanting to work on the project. Loads the card, reads only the docs it lists, checks PROGRESS.md, and produces a plan before any code is written.
---

# Start a task

Argument: a task id like `T031`. If none is given, read `PROGRESS.md` → "Next up" and use that.

## Steps

1. Locate the card: `tasks/**/T<id>-*.md`. Read it fully.
2. Read `PROGRESS.md` (short). Note any assumptions or known issues relevant to this task.
3. Read **only** the docs listed under "Read first" on the card. Do not read the rest of `docs/`.
4. Check dependencies listed on the card are marked Done in `PROGRESS.md`. If not, stop and tell the user which task must come first.
5. Look at the existing code the card points to (`Touches` section). Skim, don't read everything.
6. **Do not write code yet.** Produce a plan in this shape:

```
## Plan for T0XX — <title>
Goal (1 line):
Files to create/modify:
Backend steps / Frontend steps (numbered, small):
Tests I will write (names):
Acceptance criteria → how each will be verified:
Open questions (max 1) / Assumptions I'll make:
Out of scope (things I noticed but will NOT do; go to IDEAS.md):
```

7. Wait for the user to say "go" (or correct the plan). Then implement in the listed order, running the card's verification commands as you go.
8. Update `PROGRESS.md` → "In flight" with the task id when implementation begins.

## Rules
- If the card feels too big for one session, propose a split (T0XXa/T0XXb) in the plan; do not silently do half.
- Follow `CLAUDE.md` conventions and the domain skill for the area (django-backend, react-frontend, offline-sync, dda-engine, cognitive-games, testing).
- Never expand scope. New ideas → `tasks/IDEAS.md`.
