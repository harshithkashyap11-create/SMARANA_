---
name: handoff
description: End-of-session handoff for Smārana. Use whenever the user types /handoff, "I'm stopping for today", "save state", "end session", or when context is getting long and work is mid-task. Writes a precise resume note so the next session (with a fresh context) can continue without re-discovery.
---

# Session handoff

1. `git status`. If there are uncommitted changes that are coherent and tests pass, commit them as `wip(<area>): T0XX <what>`. If they are broken, `git stash push -m "T0XX wip"` and note the stash name.
2. Write/replace the `## In flight` section of `PROGRESS.md` with:
   ```
   - T0XX — <title>
     Status: <what works / what doesn't>
     Next concrete step: <the exact next thing to do, file and function>
     Verification currently: <which commands pass/fail>
     Gotchas discovered: <anything non-obvious>
   ```
3. Add any assumptions to "Assumptions made".
4. Commit `PROGRESS.md`: `docs: handoff T0XX`.
5. Tell the user: "Next session: `/clear` then `/start-task T0XX` — it will pick up from PROGRESS.md."
