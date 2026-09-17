---
name: django-backend
description: Conventions and patterns for the Smārana Django/DRF backend. Use this whenever writing or changing anything under backend/ — models, migrations, serializers, views, permissions, services, Celery tasks, admin, or backend tests — even if the task seems small. Covers app layout, permission scoping, audit, offline-capable models, and the endpoint checklist.
---

# Django backend conventions

Read `docs/03-data-model.md` for models and `docs/04-api-contract.md` for endpoints when the task touches them. `docs/11-permissions-matrix.md` is the permission source of truth.

## App layout (each app under `backend/apps/<name>/`)
```
models.py        thin: fields, Meta, __str__, simple properties
services.py      ALL business logic; plain functions taking explicit args; return domain objects
selectors.py     read queries (optional; use when queries get complex)
serializers.py   shape + validation only; one serializer per role where fields differ
views.py         DRF ViewSets/APIViews; call services; no logic
permissions.py   IsRole(...) + object scoping helpers
urls.py          router
admin.py         Django Admin registration (Admin portal for v1)
tasks.py         Celery tasks; thin wrappers around services
tests/           test_models.py, test_services.py, test_api.py, factories in apps/shared/tests
```

## Base mixins (`apps/shared/models.py`)
- `UUIDModel`: `id = UUIDField(primary_key=True, default=uuid4, editable=False)`
- `TimeStamped`: `created_at`, `updated_at`
- `SoftDelete`: `deleted_at`, manager `objects` excludes deleted, `all_objects` includes
- `OfflineCapable(UUIDModel, TimeStamped)`: `device_updated_at`, `idempotency_key = CharField(max_length=128, unique=True)`

## Endpoint checklist (do all of these for every endpoint)
1. `permission_classes = [IsAuthenticated, IsRole("caregiver")]` (or a list of roles).
2. `get_queryset()` scopes by assignment using `apps.patients.selectors.patients_for(user)`. Detail of unassigned → 404 automatically because queryset excludes it.
3. Writes go through a `services.py` function that also calls `audit(actor=request.user, action="update", obj=..., patient=..., changes=...)`.
4. Serializer per role if fields differ. Never `if request.user.role == ...` inside a serializer's `to_representation`.
5. Tests in `tests/test_api.py` using the `care_scenario` fixture:
   - happy path for each allowed role
   - wrong role → 403
   - assigned-to-someone-else patient → 404
   - patient accessing another patient → 404
6. Add to `docs/04-api-contract.md` if the shape differs from what is written.

## Scoping helper (`apps/patients/selectors.py`)
```python
def patients_for(user) -> QuerySet[PatientProfile]:
    if user.role == "patient":
        return PatientProfile.objects.filter(user=user)
    if user.role == "caregiver":
        return PatientProfile.objects.filter(care_assignments__caregiver=user, care_assignments__active=True)
    if user.role == "doctor":
        return PatientProfile.objects.filter(doctor_assignments__doctor=user, doctor_assignments__active=True)
    return PatientProfile.objects.none()   # admins use Django Admin, not the API
```
Use `.distinct()` when joining assignments.

## Audit helper (`apps/audit/services.py`)
`audit(actor, action, obj, patient=None, changes=None, request=None)` — call from services, never from views or signals (except login events). `changes` = `{"field": [before, after]}`.

## Patient-safe errors
Raise `apps.shared.exceptions.UserFacingError(code="reminder_not_found")`; the exception handler maps to `{detail, code}`. Frontend translates `code`. Never leak model names or stack traces.

## Celery
Tasks are idempotent and take ids, not objects. Beat schedule in `config/celery.py`. Each rule in `apps/alerts/rules.py` is a pure function `evaluate(patient, now) -> Alert | None` unit-tested with frozen time (`freezegun`).

## Settings
`config/settings/{base,dev,test,prod}.py`. Read env via `django-environ`. `.env.example` lists every key with a comment.

## Commands you will use
```
cd backend
python manage.py makemigrations <app> && python manage.py migrate
pytest -q                     # all
pytest apps/games -q -k dda   # subset
ruff check . && ruff format .
mypy apps/*/services.py
python manage.py spectacular --file schema.yml   # regenerate OpenAPI
```

See `references/patterns.md` for code templates (ViewSet, service, permission test).
