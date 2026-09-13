# T094 — Seed two complete state packs (Assam, Meghalaya) and scaffolds for six

**Phase:** 9 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T090

## Read first
- `docs/13-regional-content.md`

## Touches
- `backend/apps/content/fixtures`
- `backend/apps/content/management/commands/import_content.py`

## Goal
A CSV/folder importer and the first real content, rights-noted, at 'reviewed' status pending native-speaker review.

## Scope (do exactly this)
- `import_content` command reading `content/<STATE>/manifest.csv` + files; attribution stored; idempotent by (region, kind, title).
- Assam and Meghalaya to target counts; other states ≥5 per kind (may reuse generic items marked `generic=true`).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Translations quality (content workstream).

## Acceptance criteria
- [ ] Import twice → no duplicates; pack endpoint returns ≥ target counts for AS and ML.

## Verification
```
cd backend && ruff check . && pytest -q
cd backend && python manage.py import_content content/AS && python manage.py import_content content/AS
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
