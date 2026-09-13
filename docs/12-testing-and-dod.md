# 12 — Testing Strategy & Definition of Done

## Test pyramid for this project

| Layer | Tool | What | Target |
|---|---|---|---|
| Pure logic | pytest / Vitest | DDA, intent router, reminder id generation, alert rules, conflict detection | 100% branch coverage; shared vectors |
| Services | pytest-django | `services.py` functions with DB (factory_boy fixtures) | every service function |
| API | pytest + DRF APIClient | status codes, shapes, **permissions per role** | every endpoint: happy path + wrong role + unassigned |
| Components | Vitest + RTL | patient components: loading/empty/error, large-target, i18n key usage | key components |
| E2E | Playwright | 5 smoke flows: patient login→routine→respond; play game→level change; caregiver upload memory→patient quiz; doctor assignment→patient routine; offline round-trip | keep to ≤ 10 min run |

## Fixtures
`backend/apps/shared/tests/factories.py` with factory_boy: `UserFactory(role=…)`, `PatientFactory` (creates User+Profile+Credential), `CaregiverAssignedFactory`, `DoctorAssignedFactory`, `GameSessionFactory`. A pytest fixture `care_scenario` returns `{patient, caregiver, doctor, other_patient, other_caregiver}` — used by every permission test.

## Definition of Done (per task)
- [ ] All acceptance criteria on the card are demonstrably met (Claude lists each with how it was verified).
- [ ] Verification commands on the card pass locally.
- [ ] New endpoints have permission tests (wrong role + unassigned).
- [ ] New patient-facing strings are i18n keys with `en` filled and `as`/`bn` keys added (value may be `TODO:` until translated — the i18n lint fails on missing keys, not on TODO values).
- [ ] No TODO/FIXME left without an entry in `tasks/IDEAS.md` or `PROGRESS.md`.
- [ ] Migrations included and `makemigrations --check` clean.
- [ ] `PROGRESS.md` updated; commit message follows conventional commits; one commit (or a small clean series) per task.
- [ ] Nothing outside the card's scope was changed (the `/review-task` skill lists deviations).

## Definition of Done (per phase)
- Exit demo from `06-roadmap.md` performed for the mentor.
- CI green on `main`.
- Mentor has read at least one full diff from the phase.

## Red flags in a diff (mentor checklist)
- `@pytest.mark.skip`, `xfail`, `--no-verify`, commented-out assertions
- `permission_classes = [AllowAny]` or `IsAuthenticated` alone on patient-data endpoints
- `Model.objects.get(id=pk)` in a view without scoping
- `except Exception: pass`
- Hard-coded English in `features/patient/**`
- Numbers/percentages rendered in patient screens
- `localStorage.setItem('token'…)`
- A test that asserts `status_code in (200, 403)`
