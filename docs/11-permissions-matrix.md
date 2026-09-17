# 11 — Permissions Matrix

Legend: **C** create, **R** read, **U** update, **D** delete (soft), **–** none. "own" = the patient themself. "assigned" = via an active CareAssignment/DoctorAssignment. Every endpoint test file must include at least one test per row for a *disallowed* role expecting 403 (wrong role) or 404 (not assigned).

| Resource | Patient (own) | Caregiver (assigned) | Doctor (assigned) | Admin (Django Admin) |
|---|---|---|---|---|
| User account (self) | R, U prefs | R, U prefs | R, U prefs | CRUD all; never sees PIN/password |
| PatientCredential (PIN) | – (login only) | U reset (primary only) | – | reset trigger only |
| PatientProfile life-history fields | R | R, U | R | R |
| PatientProfile doctor fields (caps, session limit) | R | R | R, U | R |
| FamilyMember | R | C, R, U, D | R (names/relationship only, no phone) | R |
| ConsentSettings | R, U | R, U (primary) | R | R |
| CareAssignment / DoctorAssignment | R (names) | R | R | C, R, U (end) |
| RoutineItem | R | C, R, U, D (source ≠ doctor) | C, R, U, D (own source only) | R |
| Reminder | R | R | R | R |
| ReminderResponse | C, R | R | R | R |
| Medication | R | R | C, R, U | R |
| SleepLog / MoodLog | C, R | C, R (source=caregiver), U own | R (if consent) | – |
| Memory + Media | R (per visibility) | C, R, U, D | R (visibility=care_team only, and consent) | – (never) |
| MemoryQuizAttempt | C, R (summary) | R | R | – |
| GameDefinition | R (enabled) | R | R | CRUD |
| DifficultyState | R (level only via UI, never shown) | R | R, U via override | R |
| GameSession | C | R | R | – (aggregate only) |
| DifficultyChange | – | R | R, C via override | R |
| ClinicalBaseline | – | – | C, R, U | – |
| ClinicalNote | R (patient_visible) | R (care_team, patient_visible), C? no | C, R, U own | – |
| ExerciseAssignment | R (as routine) | R | C, R, U | – |
| Alert | – | R, ack, forward | R, ack, dismiss, instruct | R (SOS events only) |
| SosEvent | C | R, ack | R | R |
| NotificationPreference | – | R, U own | R, U own | – |
| Region / Language / ContentItem | R (published) | R | R | CRUD + review |
| AuditEvent | – | – | – | R (append-only for all) |
| Reports (PDF) | – | R | R | – |
| Sync push/pull | own device only | – | – | – |

## Implementation rules
1. Role check = `permission_classes = [IsAuthenticated, IsRole('caregiver')]` etc.
2. Assignment scoping = `get_queryset()` filters by `CareAssignment.objects.filter(caregiver=user, active=True).values('patient')`. Never `filter(id=pk)` from the URL without the scoping join.
3. Field-level = separate serializers per role (`PatientProfileCaregiverSerializer`, `PatientProfileDoctorSerializer`) rather than conditional logic.
4. Detail views of unassigned patients → **404**, not 403.
5. Admin actions are audited; admin never sees ClinicalNote bodies, Memories, or mood logs — enforce by not registering those models' sensitive fields in Django Admin (or `readonly_fields` limited to metadata).
6. Every write to patient data creates an `AuditEvent` with `patient` set — via a service-layer helper `audit(actor, action, obj, patient, changes)`.
