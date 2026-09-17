"""Warnings for routine occurrences within ten minutes."""

from datetime import timedelta
from typing import Any

from apps.patients.models import PatientProfile
from apps.routines.models import RoutineItem


def conflicts(
    patient: PatientProfile, fields: dict[str, Any], item: RoutineItem | None = None
) -> list[dict[str, str]]:
    def value(key: str) -> Any:
        return fields.get(key, getattr(item, key, None))

    time = value("time_of_day")
    start, end = value("start_date"), value("end_date")
    warnings = []
    for row in patient.routine_items.all():
        if item and row.id == item.id:
            continue
        delta = abs(
            (time.hour * 60 + time.minute) - (row.time_of_day.hour * 60 + row.time_of_day.minute)
        )
        if delta > 10:
            continue
        first = max(start, row.start_date)
        last = (
            min(x for x in [end, row.end_date] if x is not None)
            if end or row.end_date
            else first + timedelta(days=6)
        )
        days = set(value("days_of_week")) & set(row.days_of_week)
        if any(
            (first + timedelta(days=i)).weekday() in days
            for i in range(min(7, max(0, (last - first).days + 1)))
        ):
            warnings.append(
                {"id": str(row.id), "title": row.title, "time_of_day": row.time_of_day.isoformat()}
            )
    return warnings
