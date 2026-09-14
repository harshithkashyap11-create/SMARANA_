"""Factories shared by backend tests."""

import factory
from django.contrib.auth.hashers import make_password
from factory.django import DjangoModelFactory

from apps.accounts.models import PatientCredential, User
from apps.patients.models import CareAssignment, DoctorAssignment, PatientProfile


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda number: f"user{number}")
    display_name = factory.Sequence(lambda number: f"User {number}")
    role = User.Role.PATIENT
    password = factory.django.Password("test-password")


class PatientCredentialFactory(DjangoModelFactory):
    class Meta:
        model = PatientCredential

    user = factory.SubFactory(UserFactory, role=User.Role.PATIENT)
    login_id = factory.Sequence(lambda number: f"PATIENT{number:04d}")
    pin_hash = factory.LazyFunction(lambda: make_password("1234"))


class PatientFactory(DjangoModelFactory):
    class Meta:
        model = PatientProfile
        skip_postgeneration_save = True

    user = factory.SubFactory(UserFactory, role=User.Role.PATIENT)

    @factory.post_generation
    def credential(self, create: bool, extracted: object, **kwargs: object) -> None:
        if create:
            PatientCredentialFactory(user=self.user, **kwargs)


class CaregiverFactory(UserFactory):
    role = User.Role.CAREGIVER
    is_approved = True


class DoctorFactory(UserFactory):
    role = User.Role.DOCTOR
    is_approved = True


class CareAssignmentFactory(DjangoModelFactory):
    class Meta:
        model = CareAssignment

    patient = factory.SubFactory(PatientFactory)
    caregiver = factory.SubFactory(CaregiverFactory)
    is_primary = False


class DoctorAssignmentFactory(DjangoModelFactory):
    class Meta:
        model = DoctorAssignment

    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(DoctorFactory)
