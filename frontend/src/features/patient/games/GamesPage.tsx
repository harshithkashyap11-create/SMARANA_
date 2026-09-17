import { FavouriteButton } from "./FavouriteButton";
import { gameLabel } from "../../../content/game-labels";
/* eslint-disable react-refresh/only-export-components -- patient lookup is shared by the adjacent game route. */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { apiClient } from "../../../api/client";
import { getMeta, setMeta } from "../../../db/schema";
import { isFakeOffline } from "../../../db/outbox";
import { listGames, type GameDefinitionDto } from "../../../db/repo/games";
import { gameCatalog as games } from "../../../games/registry";
import { selectDailyGames } from "../../../games/dailySession";
import { db } from "../../../db/schema";
import {
  loadLatestResume,
  type ResumeState,
} from "../../../games/engine/resume";

const challengeKey = `games-challenge:${new Date().toISOString().slice(0, 10)}`;
export function GamesPage() {
  const { t, i18n } = useTranslation();
  const [daily, setDaily] = useState<string[]>([]);
  const [region, setRegion] = useState("AS");
  const [definitions, setDefinitions] = useState<GameDefinitionDto[]>([]);
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [challenge, setChallenge] = useState(
    () => sessionStorage.getItem(challengeKey) === "true",
  );
  useEffect(() => {
    void Promise.all([listGames(), loadLatestResume(), currentPatient()])
      .then(async ([items, interrupted, patient]) => {
        setRegion(patient.region);
        const history = await db.gameSessions.where("patientId").equals(patient.id).toArray();
        setDaily(selectDailyGames(games, history).map((game) => game.key));
        setDefinitions(items);
        setResume(interrupted);
      })
      .catch(() => {
        setDefinitions(
          games.map((game) => ({
            key: game.key,
            name: game.name,
            cognitive_domains: game.domains,
            min_level: game.minDifficulty,
            max_level: game.maxDifficulty,
            is_regional: true,
          })),
        );
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <p>{t("games.loadingList")}</p>;
  return (
    <section>
      {i18n.resolvedLanguage !== "en" && <p role="status">{t("games.translationFallback")}</p>}
      <h1 className="mb-5 text-3xl font-bold">{t("games.title")}</h1>
      {failed && (
        <p className="mb-4 rounded-card bg-warning/20 p-4">
          {t("games.offlineList")}
        </p>
      )}
      {resume && (
        <Link
          className="mb-5 block min-h-touch rounded-card bg-success/20 p-5 text-xl font-bold"
          to={`/patient/games/${resume.gameKey}`}
        >
          <span className="block text-sm font-normal">
            {t("games.resumeTitle")}
          </span>
          {games.find((item) => item.key === resume.gameKey)?.name ??
            t("games.continue")}
        </Link>
      )}
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
      <section className="mb-6" aria-label={t("games.dailyTitle")}>
        <h2 className="mb-3 text-2xl font-bold">{t("games.dailyTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {daily.filter((key) => definitions.some((game) => game.key === key)).map((key) => {
            const entry = games.find((game) => game.key === key)!;
            return <Link key={key} className="min-h-touch rounded-card border-2 border-primary p-4" to={entry.route}>{t(entry.nameKey, { defaultValue: entry.name })}</Link>;
          })}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {definitions
          .filter((item) => games.some((game) => game.enabled && game.key === item.key))
          .map((game) => (
            <div key={game.key}>
              <Link
                className="block min-h-touch rounded-card border-2 border-primary bg-surface p-5 text-xl font-bold"
                key={game.key}
                to={`/patient/games/${game.key}`}
              >
                <span>{gameLabel(game.key, game.name, region)}</span>
                <span className="mt-2 block text-base font-normal">{t(games.find((entry) => entry.key === game.key)!.descriptionKey, { defaultValue: game.name })}</span>
                <span className="mt-2 block text-base font-normal">{t("games.duration", { minutes: games.find((entry) => entry.key === game.key)!.estimatedDurationMin })}</span>
                {game.is_regional && (
                  <span className="ml-3 rounded-full bg-success/20 px-3 py-1 text-sm font-normal">
                    {t("games.regional")}
                  </span>
                )}
              </Link>
              <Link className="inline-flex min-h-touch items-center p-3" to={`/patient/games/${game.key}?practice=true`}>{t("games.practice")}</Link>
              <FavouriteButton kind="game" id={game.key} />
            </div>
          ))}
      </div>
      {definitions.filter((item) => games.some((game) => game.enabled && game.key === item.key))
        .length === 0 && <p>{t("games.empty")}</p>}
    </section>
  );
}
interface GamePatient {
  id: string;
  sessionCapMinutes: number;
  region: string;
  language: string;
  knownPlaces?: string[];
  useMemoriesInQuiz?: boolean;
}
export async function currentPatient(): Promise<GamePatient> {
  const cached = await getMeta("gamePatient");
  if ((isFakeOffline() || !navigator.onLine) && cached)
    return JSON.parse(cached) as GamePatient;
  try {
    const response = await apiClient<{
      results: Array<{
        id: string;
        session_cap_minutes: number | null;
        region?: string;
        language?: string;
      }>;
    }>("/api/v1/patients/", { method: "GET" });
    if (!response.results[0]) throw new Error("Patient unavailable");
    const patient = {
      id: response.results[0].id,
      sessionCapMinutes: response.results[0].session_cap_minutes ?? 20,
      region: response.results[0].region || "AS",
      language: response.results[0].language ?? "en",
      knownPlaces: [] as string[],
      useMemoriesInQuiz: cached
        ? Boolean((JSON.parse(cached) as GamePatient).useMemoriesInQuiz)
        : false,
    };
    try {
      const profile = await apiClient<{
        known_places: Array<string | { name?: string; title?: string }>;
      }>(`/api/v1/patients/${patient.id}/profile/`, { method: "GET" });
      patient.knownPlaces = (profile.known_places ?? [])
        .map((place) =>
          typeof place === "string" ? place : (place.name ?? place.title ?? ""),
        )
        .filter(Boolean);
    } catch {
      /* The patient card still supports games when profile refresh is unavailable. */
    }
    await setMeta("gamePatient", JSON.stringify(patient));
    return patient;
  } catch (error) {
    if (cached) return JSON.parse(cached) as GamePatient;
    throw error;
  }
}
