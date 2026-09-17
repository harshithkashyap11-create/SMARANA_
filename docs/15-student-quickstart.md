# 15 — Student Quickstart (read this first, it's short)

## Day 1 (setup, ~1 hour)
1. Install Docker Desktop, Node 20, Python 3.12, git. Log in to Claude Code.
2. `mkdir smarana && cd smarana && git init`, copy this kit's `CLAUDE.md`, `PROGRESS.md`, `docs/`, `tasks/`, `shared/`, `.claude/`, `.gitignore` into it. `git add -A && git commit -m "chore: project kit"`.
3. Read, in order: `docs/00-mentor-playbook.md` (§2–3 only), `docs/01-scope-and-mvp.md`, `tasks/README.md`. Skim `docs/02-architecture.md`. Don't read everything else — the task cards will point you to the right doc at the right time.
4. Open Claude Code in the folder. Type `/start-task T001`.

## The only workflow you need
```
/clear
/start-task T0XX      # read plan, reply "go" (or fix the plan first)
/review-task          # read the diff yourself. Really read it.
/finish-task
```
`/handoff` when you stop for the day.

## Good prompts vs bad prompts

| Bad (burns budget, produces mush) | Good |
|---|---|
| "Build the caregiver dashboard" | `/start-task T040` |
| "It's not working, fix it" | "Run `pytest apps/routines -q` and fix the failures. Don't change the tests." |
| "Make it look nicer" | "The reminder buttons are below 64px on a 360px screen. Fix per docs/14-design-system.md." |
| Pasting the whole PDF spec | "Read docs/07-dda-spec.md rules 6–8 and tell me why this session held instead of demoting." |
| "Add a feature for X while you're at it" | Write X in `tasks/IDEAS.md`; keep going. |

## When Claude Code does something you didn't ask for
Say: "That's outside T0XX. Revert it and add a line to tasks/IDEAS.md." Every time. It learns nothing across sessions, so you are the memory.

## When you're stuck
1. Ask Claude to explain the failing thing in plain words *before* asking for a fix.
2. Check `PROGRESS.md` → Assumptions. Half of "stuck" is an assumption that was wrong.
3. Write down the question for the mentor in `PROGRESS.md` → Known issues, and move to the next independent card.

## Things you must understand yourself (not just have Claude do)
By the end of Phase 3 you should be able to explain, on a whiteboard, without notes:
- Why `get_queryset()` is where scoping lives, and what happens if you forget it.
- How the outbox pattern makes offline writes safe to retry.
- Why the DDA function has no randomness and no clock inside it.
- Why the patient screens never show numbers.
If you can't, ask Claude to teach you that topic for 10 minutes (that's a great use of budget).
