/* eslint-disable react-refresh/only-export-components -- patient lookup is shared by the adjacent game route. */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { apiClient } from "../../../api/client";
import { listGames, type GameDefinitionDto } from "../../../db/repo/games";
import { games } from "../../../games/registry";

const challengeKey = `games-challenge:${new Date().toISOString().slice(0, 10)}`;
export function GamesPage() {
  const { t } = useTranslation();
  const [definitions, setDefinitions] = useState<GameDefinitionDto[]>([]);
  const [challenge, setChallenge] = useState(
    () => sessionStorage.getItem(challengeKey) === "true",
  );
  useEffect(() => {
    void listGames()
      .then(setDefinitions)
      .catch(() =>
        setDefinitions(
          games.map((game) => ({
            key: game.key,
            name: game.name,
            cognitive_domains: game.domains,
            min_level: 1,
            max_level: 10,
            is_regional: true,
          })),
        ),
      );
  }, []);
  return (
    <section>
      <h1 className="mb-5 text-3xl font-bold">{t("games.title")}</h1>
      <label className="mb-6 flex min-h-touch items-center gap-4 rounded-card bg-surface p-4 text-xl font-bold">
        <input
          checked={challenge}
          className="h-7 w-7"
          type="checkbox"
          onChange={(event) => {
            setChallenge(event.target.checked);
            sessionStorage.setItem(challengeKey, String(event.target.checked));
          }}
        />
        {t("games.challenge")}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {definitions
          .filter((item) => games.some((game) => game.key === item.key))
          .map((game) => (
            <Link
              className="min-h-touch rounded-card border-2 border-primary bg-surface p-5 text-xl font-bold"
              key={game.key}
              to={`/patient/games/${game.key}`}
            >
              {game.name}
            </Link>
          ))}
      </div>
    </section>
  );
}
export async function currentPatient(): Promise<{
  id: string;
  sessionCapMinutes: number;
}> {
  const response = await apiClient<{
    results: Array<{ id: string; session_cap_minutes: number | null }>;
  }>("/api/v1/patients/", { method: "GET" });
  if (!response.results[0]) throw new Error("Patient unavailable");
  return {
    id: response.results[0].id,
    sessionCapMinutes: response.results[0].session_cap_minutes ?? 20,
  };
}
