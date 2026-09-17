# T110 — PDF clinical report and caregiver report (WeasyPrint) with disclaimer + export audit

**Phase:** 10 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T051, T055, T044

## Read first
- `docs/05-user-stories.md (G3, H5)`
- `docs/01-scope-and-mvp.md`

## Touches
- `backend/apps/reports`

## Goal
Downloadable PDF covering profile, period, sessions, domain trends (rendered charts as SVG/PNG via matplotlib), difficulty history, adherence, flags, caregiver notes, doctor recommendations, next review — with the 'engagement and tracking support, not a diagnosis' statement.

## Scope (do exactly this)
- Django template + WeasyPrint; chart images generated server-side; caregiver variant omits doctor-only notes; `export` audit; 'Download report' buttons in both portals.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [x] Tests: PDF generated with expected sections (text extraction); caregiver variant lacks doctor_only text; audit row.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [x] `/review-task` verdict READY
- [x] `/finish-task` run (PROGRESS.md updated, committed)

Evidence and review: `docs/reviews/T109-T112.md`.
