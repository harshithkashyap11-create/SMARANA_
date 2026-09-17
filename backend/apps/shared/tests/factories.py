"""Factories shared by backend tests."""

import factory
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.accounts.models import PatientCredential, User
from apps.patients.models import (
    CareAssignment,
    ConsentSettings,
    DoctorAssignment,
    FamilyMember,
    PatientProfile,
)
from apps.routines.models import Reminder, RoutineItem


class UserFactory(DjangoModelFactory[User]):
    class Meta:
        model = User

    username = factory.Sequence(lambda number: f"user{number}")
    display_name = factory.Sequence(lambda number: f"User {number}")
    role = User.Role.PATIENT
    # factory-boy 3.3 Password works at runtime but is absent from types-factory-boy 0.4.
    password = factory.django.Password("test-password")  # type: ignore[attr-defined]


class PatientCredentialFactory(DjangoModelFactory[PatientCredential]):
    class Meta:
        model = PatientCredential

    user: factory.SubFactory[object, User] = factory.SubFactory(UserFactory, role=User.Role.PATIENT)
    login_id = factory.Sequence(lambda number: f"PATIENT{number:04d}")
    pin_hash = factory.LazyFunction(lambda: make_password("1234", hasher="argon2"))


class PatientFactory(DjangoModelFactory[PatientProfile]):
    class Meta:
        model = PatientProfile
        skip_postgeneration_save = True

    user: factory.SubFactory[object, User] = factory.SubFactory(UserFactory, role=User.Role.PATIENT)

    @factory.post_generation
    def credential(self, create: bool, extracted: object, **kwargs: object) -> None:
        if create:
            PatientCredentialFactory.create(user=self.user, **kwargs)


class CaregiverFactory(UserFactory):
    role = User.Role.CAREGIVER
    is_approved = True


class DoctorFactory(UserFactory):
    role = User.Role.DOCTOR
    is_approved = True


class CareAssignmentFactory(DjangoModelFactory[CareAssignment]):
    class Meta:
        model = CareAssignment

    patient: factory.SubFactory[object, PatientProfile] = factory.SubFactory(PatientFactory)
    caregiver: factory.SubFactory[object, User] = factory.SubFactory(CaregiverFactory)
    is_primary = False


class DoctorAssignmentFactory(DjangoModelFactory[DoctorAssignment]):
    class Meta:
        model = DoctorAssignment

    patient: factory.SubFactory[object, PatientProfile] = factory.SubFactory(PatientFactory)
    doctor: factory.SubFactory[object, User] = factory.SubFactory(DoctorFactory)


class FamilyMemberFactory(DjangoModelFactory[FamilyMember]):
    class Meta:
        model = FamilyMember

    patient: factory.SubFactory[object, PatientProfile] = factory.SubFactory(PatientFactory)
    name = factory.Sequence(lambda number: f"Family member {number}")
    relationship = FamilyMember.Relationship.FRIEND


class ConsentSettingsFactory(DjangoModelFactory[ConsentSettings]):
    class Meta:
        model = ConsentSettings

    patient: factory.SubFactory[object, PatientProfile] = factory.SubFactory(PatientFactory)


class RoutineItemFactory(DjangoModelFactory[RoutineItem]):
    class Meta:
        model = RoutineItem

    patient: factory.SubFactory[object, PatientProfile] = factory.SubFactory(PatientFactory)
    title = "Tea with family"
    category = RoutineItem.Category.CUSTOM
    time_of_day = factory.LazyFunction(lambda: timezone.localtime().time())
    days_of_week: factory.LazyFunction[list[int]] = factory.LazyFunction(list)
    start_date = factory.LazyFunction(timezone.localdate)
    source = RoutineItem.Source.SYSTEM


class ReminderFactory(DjangoModelFactory[Reminder]):
    class Meta:
        model = Reminder

    routine_item: factory.SubFactory[object, RoutineItem] = factory.SubFactory(RoutineItemFactory)
    patient: factory.SelfAttribute[object, PatientProfile] = factory.SelfAttribute(
        "routine_item.patient"
    )
    scheduled_at = factory.LazyFunction(timezone.now)
