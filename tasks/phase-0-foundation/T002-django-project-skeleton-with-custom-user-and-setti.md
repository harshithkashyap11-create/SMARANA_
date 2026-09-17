# T002 — Django project skeleton with custom User and settings split

**Phase:** 0 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T001

## Read first
- `docs/02-architecture.md`
- `docs/03-data-model.md (accounts section only)`

## Touches
- `backend/config`
- `backend/apps/accounts`
- `backend/apps/shared`

## Goal
Django 5 + DRF project with a custom User (role field) created *before* the first migration, settings split, and a health endpoint.

## Scope (do exactly this)
- `config/settings/{base,dev,test,prod}.py` using django-environ; `config/urls.py` with `/api/v1/health/` returning `{status:'ok', db:'ok'}`.
- `apps/shared`: `UUIDModel`, `TimeStamped`, `SoftDelete`, `OfflineCapable` mixins; `IsRole` permission; `UserFacingError` + exception handler; pagination class.
- `apps/accounts.User(AbstractUser)` with `role` TextChoices (patient/caregiver/doctor/admin), `display_name`, `theme`, `font_scale`, `is_approved`, `phone`; `AUTH_USER_MODEL` set.
- Install: djangorestframework, djangorestframework-simplejwt, drf-spectacular, django-filter, django-environ, psycopg, celery, redis, argon2-cffi, ruff, mypy, pytest-django, factory_boy, freezegun.
- `pyproject.toml` with ruff + mypy config; `pytest.ini` with `DJANGO_SETTINGS_MODULE=config.settings.test`.
- First migration for accounts. `conftest.py` with `api` fixture and a `UserFactory`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Any login endpoint (T010).
- Other apps.

## Acceptance criteria
- [ ] `GET /api/v1/health/` returns 200 with db ok inside compose.
- [ ] `python manage.py createsuperuser` works and Django Admin loads at `/admin/`.
- [ ] `makemigrations --check` is clean; a test creating a user with role=patient passes.

## Verification
```
cd backend && ruff check . && pytest -q
cd backend && python manage.py makemigrations --check --dry-run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
