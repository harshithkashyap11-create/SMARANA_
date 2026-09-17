# Tasks — how this folder works

Every file here is a **task card**: one unit of work sized for a single Claude Code session (30–90 minutes). The card *is* the prompt. You never have to explain the project to Claude Code again; the card tells it what to read and what "done" means.

## Files
- `BACKLOG.md` — the ordered list of all cards. Work top to bottom.
- `IDEAS.md` — parking lot for anything that comes up mid-task.
- `phase-N-*/T0XX-*.md` — the cards.

## The loop
```
/clear
/start-task T0XX     → Claude reads the card + linked docs, proposes a plan, waits for "go"
(implement)
/review-task         → self-review against acceptance criteria; you read the diff
/finish-task         → verification re-run, PROGRESS.md updated, commit
```
End of day: `/handoff`.

## Card anatomy
| Section | Meaning |
|---|---|
| Phase / Size / Depends on | Size S/M/L. If L feels too big, split into a/b in the plan. Depends must be done first. |
| Read first | The **only** docs Claude should read for this task. Keeps context small. |
| Touches | Where the code goes. |
| Goal | One sentence. If the plan doesn't serve this sentence, it's wrong. |
| Scope | The explicit list. Nothing else. |
| Out of scope | Tempting things that belong to other cards. |
| Acceptance criteria | Checkboxes. Each must have evidence at `/finish-task`. |
| Verification | Commands that must pass. |

## Sizing guide for splitting
If a card touches both backend and frontend and is L, split as `T0XXa` (backend + tests) and `T0XXb` (frontend + tests). Note the split in `PROGRESS.md` and `BACKLOG.md`.

## Adding a card
Copy the structure exactly. Give it the next free id in its phase. Add it to `BACKLOG.md` in dependency order. Keep the "Read first" list to ≤ 3 docs.
