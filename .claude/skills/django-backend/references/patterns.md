# Backend code templates

## Role permission
```python
# apps/shared/permissions.py
from rest_framework.permissions import BasePermission

class IsRole(BasePermission):
    def __init__(self, *roles: str): self.roles = roles
    def __call__(self): return self
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in self.roles)
```
Usage: `permission_classes = [IsAuthenticated, IsRole("caregiver", "doctor")]`

## Scoped nested ViewSet
```python
class RoutineItemViewSet(viewsets.ModelViewSet):
    serializer_class = RoutineItemSerializer
    permission_classes = [IsAuthenticated, IsRole("patient", "caregiver", "doctor")]

    def get_queryset(self):
        return (RoutineItem.objects
                .filter(patient__in=patients_for(self.request.user))
                .filter(patient_id=self.kwargs["patient_pk"]))

    def perform_create(self, serializer):
        patient = get_object_or_404(patients_for(self.request.user), pk=self.kwargs["patient_pk"])
        services.create_routine_item(actor=self.request.user, patient=patient, **serializer.validated_data)
```

## Service with audit
```python
def create_routine_item(*, actor, patient, **fields) -> RoutineItem:
    if actor.role not in ("caregiver", "doctor"):
        raise UserFacingError("not_allowed")
    item = RoutineItem.objects.create(patient=patient, created_by=actor,
                                      source="doctor" if actor.role == "doctor" else "caregiver", **fields)
    audit(actor, "create", item, patient=patient)
    return item
```

## Permission test pattern
```python
@pytest.mark.django_db
class TestRoutineItemsPermissions:
    def test_caregiver_sees_assigned_only(self, api, care_scenario):
        api.force_authenticate(care_scenario.caregiver)
        ok = api.get(f"/api/v1/patients/{care_scenario.patient.id}/routine-items/")
        assert ok.status_code == 200
        other = api.get(f"/api/v1/patients/{care_scenario.other_patient.id}/routine-items/")
        assert other.status_code == 404

    def test_patient_cannot_create(self, api, care_scenario):
        api.force_authenticate(care_scenario.patient.user)
        r = api.post(f"/api/v1/patients/{care_scenario.patient.id}/routine-items/", {...}, format="json")
        assert r.status_code == 403
```

## Idempotent upsert (sync)
```python
def upsert_offline_record(*, user, model_key, obj_id, idempotency_key, data, device_updated_at):
    Model = SYNC_MODELS[model_key]                      # allowlist
    if IdempotencyRecord.objects.filter(key=idempotency_key).exists():
        return "accepted"
    with transaction.atomic():
        existing = Model.all_objects.select_for_update().filter(id=obj_id).first()
        if existing and existing.device_updated_at >= device_updated_at:
            IdempotencyRecord.objects.create(key=idempotency_key, user=user, model=model_key, object_id=obj_id)
            return "accepted"
        ...validate patient == user.patient, then create/update...
        IdempotencyRecord.objects.create(...)
    return "accepted"
```
