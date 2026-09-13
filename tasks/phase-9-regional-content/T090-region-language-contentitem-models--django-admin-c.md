# T090 — Region, Language, ContentItem models + Django Admin curation with review workflow

**Phase:** 9 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T060

## Read first
- `docs/13-regional-content.md`
- `docs/03-data-model.md (content)`

## Touches
- `backend/apps/content`

## Goal
Content models, admin with image/audio upload, per-state filters, review status transitions, and a 'missing translations' report.

## Scope (do exactly this)
- Models; admin with list filters (region, kind, review_status), inline preview, bulk 'Mark reviewed' (requires reviewer), 'Publish' (reviewed only).
- Admin view listing ContentItems missing a translation for each enabled language.
- Seed 8 Regions and languages en/as/bn/mni/kha/lus (mni/kha/lus disabled).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Frontend.

## Acceptance criteria
- [ ] Tests: publish from draft → 400; missing-translation report correct.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
