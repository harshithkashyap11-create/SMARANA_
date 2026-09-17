import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  routineRepository,
  type Medication,
  type RoutineRepository,
} from "../../../db/repo/routine";
import { BigButton, Card } from "../../../shared/ui";

export function MedicinesPage({
  repo = routineRepository,
}: {
  repo?: RoutineRepository;
}) {
  const { t } = useTranslation();
  const [medicines, setMedicines] = useState<Medication[]>([]);
  useEffect(() => {
    void repo.getMedications().then(setMedicines);
  }, [repo]);
  const next = useMemo(
    () =>
      medicines
        .flatMap((m) => m.times.map((time) => ({ m, time })))
        .filter(({ time }) => time >= new Date().toTimeString().slice(0, 5))
        .sort((a, b) => a.time.localeCompare(b.time))[0],
    [medicines],
  );
  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">{t("medicines.title")}</h1>
      {medicines.map((medicine) => (
        <Card
          key={medicine.id}
          className={
            next?.m.id === medicine.id ? "border-4 border-primary" : ""
          }
        >
          <h2 className="text-2xl font-bold">{medicine.name}</h2>
          <p>{medicine.dose}</p>
          <p>{medicine.times.join(", ")}</p>
          <p>{medicine.instructions}</p>
          {next?.m.id === medicine.id && (
            <strong>{t("medicines.nextDose")}</strong>
          )}
        </Card>
      ))}
      <BigButton
        onClick={() => {
          window.location.href = "tel:";
        }}
      >
        {t("medicines.askPriya")}
      </BigButton>
    </section>
  );
}
