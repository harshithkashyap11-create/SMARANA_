---
name: finish-task
description: Close out the current Smārana task card. Use whenever the user types /finish-task, says "we're done", "wrap up", "commit this task", or after all acceptance criteria pass. Re-runs verification, updates PROGRESS.md, and makes a conventional commit.
---

# Finish a task

1. Re-run every verification command on the task card **and** the global ones from `CLAUDE.md`:
   ```
   cd backend && ruff check . && pytest -q && python manage.py makemigrations --check --dry-run
   cd frontend && npm run lint && npm run typecheck && npm test -- --run
   ```
   If anything fails, fix it first. Do not proceed with failures. Do not weaken tests.
2. Walk the card's acceptance criteria one by one and state, for each, the evidence (test name, command output, or manual step the user did).
3. Run `git status` and `git diff --stat`. Confirm every changed file relates to the card. Anything unrelated: revert it or ask.
4. Update `PROGRESS.md`:
   - Move the task from "In flight" to the "Done" table with today's date and a one-line note.
   - Add any assumptions made to "Assumptions made".
   - Add any tech debt to "Known issues".
   - Set "Next up" to the next task id in `tasks/BACKLOG.md` order (skip ones marked done).
5. Commit with a conventional message that includes the task id:
   `feat(games): T031 DDA pure function in Python with shared vectors`
   Multiple logical changes → multiple commits, but no more than 3.
6. Print a 5-line summary for the mentor: what was built, how to see it, what was assumed, what's next, and any concern.
7. Remind the user to `/clear` before starting the next task.
