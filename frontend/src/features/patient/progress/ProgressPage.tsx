import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../../api/client";
import { Card } from "../../../shared/ui";

interface Summary {
  completed_today: number;
  points: number;
  streak_days: number;
  favourite_games: string[];
  upcoming: Array<{ id: string; title: string }>;
}
interface PatientList {
  results: Array<{ id: string }>;
}
export function ProgressPage({ load }: { load?: () => Promise<Summary> }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    void (
      load
        ? load()
        : apiClient<PatientList>("/api/v1/patients/", { method: "GET" }).then(
            (p) =>
              apiClient<Summary>(
                `/api/v1/patients/${p.results[0]?.id}/progress-summary/`,
                { method: "GET" },
              ),
          )
    ).then(setSummary);
  }, [load]);
  if (!summary) return <p>{t("progress.loading")}</p>;
  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">{t("progress.title")}</h1>
      <Card>
        <h2 className="text-2xl font-bold">
          {t("progress.completed", { count: summary.completed_today })}
        </h2>
      </Card>
      <Card>
        <h2 className="text-2xl font-bold">
          {t("progress.points", { count: summary.points })}
        </h2>
      </Card>
      <Card>
        <h2 className="text-2xl font-bold">{t("progress.streak")}</h2>
        <p
          aria-label={t("progress.streakLabel", { count: summary.streak_days })}
          className="text-3xl"
        >
          {"★".repeat(summary.streak_days)}
        </p>
      </Card>
      <Card>
        <h2 className="text-2xl font-bold">{t("progress.next")}</h2>
        {summary.upcoming.map((item) => (
          <p key={item.id}>{item.title}</p>
        ))}
      </Card>
    </section>
  );
}
