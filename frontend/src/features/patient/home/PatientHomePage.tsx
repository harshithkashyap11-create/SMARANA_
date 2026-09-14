import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  patientRepository,
  type PatientRepository,
} from "../../../db/repo/patient";
import { useAuthStore } from "../../auth/authStore";
import { useAppContext } from "../../../app/context";
import { BigButton, Card, IconTile, OrientationCard } from "../../../shared/ui";
import { abandonResume, loadLatestResume } from "../../../games/engine/resume";

const tiles = [
  ["games", "◈"],
  ["medicines", "✚"],
  ["sleep", "☾"],
  ["memories", "▧"],
  ["calm", "≈"],
  ["people", "♧"],
  ["progress", "★"],
  ["routine", "☑"],
] as const;

export function PatientHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = useAuthStore((state) => state.user?.display_name ?? "");
  const { repos } = useAppContext();
  const repo =
    (repos.patient as PatientRepository | undefined) ?? patientRepository;
  const orientation = useQuery({
    queryKey: ["patient", "orientation"],
    queryFn: () => repo.getOrientation(),
  });
  const interrupted = useQuery({
    queryKey: ["games", "interrupted"],
    queryFn: loadLatestResume,
    enabled: orientation.isSuccess,
  });

  if (orientation.isPending) return <p>{t("health.loading")}</p>;
  if (orientation.isError) return <p>{t("health.unavailable")}</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold leading-tight">
        {t(`home.greeting_${orientation.data.greeting_key}`, { name })}
      </h1>
      <OrientationCard orientation={orientation.data} />
      {interrupted.data ? (
        <Card aria-labelledby="resume-game-title" className="space-y-3">
          <h2 id="resume-game-title" className="text-2xl font-bold">
            {t("games.resumeTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <BigButton
              onClick={() =>
                navigate(`/patient/games/${interrupted.data?.gameKey}`)
              }
            >
              {t("games.continue")}
            </BigButton>
            <BigButton
              variant="secondary"
              onClick={() => {
                const resume = interrupted.data;
                if (!resume) return;
                void abandonResume(resume).then(() => {
                  void interrupted.refetch();
                  navigate(`/patient/games/${resume.gameKey}`);
                });
              }}
            >
              {t("games.startOver")}
            </BigButton>
          </div>
        </Card>
      ) : null}
      <section aria-labelledby="home-sections" className="space-y-3">
        <h2 id="home-sections" className="text-2xl font-bold">
          {t("home.choose")}
        </h2>
        <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
          {tiles.map(([key, icon]) => (
            <IconTile
              key={key}
              icon={<span aria-hidden="true">{icon}</span>}
              label={t(`home.tiles.${key}`)}
              onClick={() => navigate(`/patient/${key}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
