# 00 — Mentor Playbook

Audience: the mentor first, then the student. Read this before anything else.

## 1. What you are actually mentoring

The spec is ~30 pages written with a lot of enthusiasm. It describes a mature product (v3 of something). A second-year student with Claude Code on a $100 plan can build a **credible v1** in 12–16 weeks *only if* the spec is treated as a vision document, not a backlog.

Your job is not to teach Django or React. Claude Code can do that. Your job is to teach:

1. **Scoping** — cutting a vision into shippable slices (see `01-scope-and-mvp.md`).
2. **Sequencing** — what must exist before what (see `06-roadmap.md`).
3. **Verification** — knowing when something is actually done (see `12-testing-and-dod.md`).
4. **Judgement about AI-generated code** — reading diffs, asking "why", spotting when Claude has silently widened scope or faked a test.

## 2. The working loop (what the student does every day)

```
open Claude Code in repo
  → /start-task T0XX        (Claude reads the card + linked docs, enters plan mode, proposes a plan)
  → student reads plan, says "go" or corrects it
  → Claude implements, runs verification commands
  → /review-task            (Claude self-reviews against acceptance criteria; student reads the diff)
  → /finish-task            (updates PROGRESS.md, commits with conventional message)
  → /clear                  (fresh context for next task)
  → repeat, or /handoff at end of day
```

One task ≈ one session ≈ 30–90 minutes of wall time. The task cards in `tasks/` are sized for that.

## 3. Using Claude Code well on the $100 plan

The plan has usage limits that reset on a rolling window. The student will hit them if they work carelessly. The habits below roughly halve token use and produce better code anyway:

- **Small context beats big context.** `/clear` after every task. Do not paste the spec into the chat; point Claude at the specific doc file the task card lists.
- **Plan mode first, always.** Shift+Tab into plan mode (or ask "plan only, don't write code yet"). Reading a plan costs seconds; undoing a wrong implementation costs an hour of budget.
- **Let Claude read tests, not you describe bugs.** "Run `pytest apps/games -q` and fix the failures" is cheaper and more accurate than paraphrasing errors.
- **Don't ask for whole features.** "Build the caregiver portal" burns the budget and produces mush. "T042: caregiver reminder editor, backend only" produces something you can review.
- **Use `/compact` when a session gets long** instead of continuing with a bloated context.
- **Verification commands over vibes.** Every task card lists exact commands. Claude runs them. If they don't pass, the task isn't done — no matter how confident the summary sounds.
- **Keep `CLAUDE.md` short.** It is loaded every session. Detailed knowledge lives in `docs/` and in skills that load only when relevant.
- **Model choice.** Use the default model for implementation. If the student has the option, use a cheaper model for mechanical tasks (renames, adding i18n keys, writing fixtures) and the stronger one for design/architecture tasks and debugging.
- **Watch for scope creep by the model.** Claude will often "helpfully" add a feature. The `/review-task` skill asks it to list anything outside the card. Teach the student to say "revert that, add it to IDEAS.md".

## 4. Weekly mentor ritual (30–45 min)

1. `git log --oneline` since last week. One commit per task? Messages make sense?
2. Open `PROGRESS.md`. Read "Assumptions made". Confirm or correct each one. This is the highest-leverage thing you do.
3. Pick **one** merged task and read the full diff together. Ask: "Why is this in `services.py`? What happens if the network drops here? Who can call this endpoint?"
4. Run the app. Click through as a patient. Elderly-first UI problems are obvious in 2 minutes of use and invisible in code review.
5. Re-prioritise `tasks/BACKLOG.md` if needed. Promote from `IDEAS.md` sparingly.

## 5. Traps to watch for in this specific project

| Trap | Why it happens | Guardrail |
|---|---|---|
| Building all 4 portals in parallel | Spec lists them equally | Roadmap builds Patient → Caregiver → Doctor → Admin. Admin is Django Admin for v1. |
| "Local LLM voice assistant" as week 1 | It's the exciting bit | Voice is Phase 8. Rule-based intents first. LLM fallback is optional. |
| 12 games each hand-crafted | Spec says 10–12 | Build a game *framework* (T030) then games are 1 task each and share DDA/metrics. |
| Fake offline ("it caches the HTML") | Offline is hard | Phase 7 has a literal test: turn off network, play a game, reload, turn on network, check server has the session. |
| Metrics shown to patients | Easy to copy from caregiver screen | Design-system rule + review checklist item. |
| Permissions "hidden in UI only" | Fast to do | Every endpoint test includes a "wrong role → 403/404" case. `11-permissions-matrix.md` is the checklist. |
| Claude "passes" tests by weakening them | Happens under pressure | Diff review: look for `skip`, `xfail`, loosened assertions, `try/except pass`. |
| Regional content as an afterthought | Content is not code | Phase 9 is content tooling. Content itself is a parallel, non-coding workstream (student + family/friends who speak the languages). |

## 6. What "done" looks like at the end

A demo where: a patient logs in with a PIN, sees today's routine and an orientation card, plays 3+ games with difficulty visibly adapting, does a memory quiz from caregiver-uploaded photos, gets a reminder and marks it taken — **all with Wi-Fi off** — then Wi-Fi comes on and the caregiver portal shows what happened, and a doctor downloads a PDF report. Everything else is bonus.

## 7. How to talk to the student about the spec

Do not say "the spec is too big". Say: "Everything in the spec is in `docs/01-scope-and-mvp.md`, tagged MVP, v1, or v2. We build in that order. Nothing is deleted; it's sequenced." That preserves motivation and teaches prioritisation at the same time.

## 8. Rough calendar (adjust to the student's hours)

| Weeks | Phase | Outcome |
|---|---|---|
| 1 | 0 Foundation | Repo runs in Docker, CI green, empty React app served |
| 2 | 1 Auth & roles | Four logins, role routing, permission tests |
| 3–4 | 2 Patient core | Home, orientation card, routine, reminders, calm time, my people |
| 5–7 | 3 Games & DDA | Framework + DDA + 6 games (then 6 more later) |
| 8 | 4 Caregiver | Live dashboard, routine editor, memory uploads, alerts |
| 9 | 5 Doctor | Assignments, metrics views, notes, DDA overrides |
| 10 | 6 Admin | Django Admin customised, assignments, audit |
| 11–12 | 7 Offline/PWA | Outbox sync, service worker, offline demo passes |
| 13 | 8 Voice | Web Speech intents, slow speech, language lock |
| 14 | 9 Regional content | Content model + admin tooling + 2–3 states seeded |
| 15–16 | 10 Reports & polish | PDF reports, walkthrough mode, guest mode, remaining games |
