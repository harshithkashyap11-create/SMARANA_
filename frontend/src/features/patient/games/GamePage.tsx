import { useTranslation } from "react-i18next";
import { gameLabel } from "../../../content/game-labels";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadContentPack, type ContentPack } from "../../../content/packs";
import { listGames, type GameDefinitionDto } from "../../../db/repo/games";
import { GamePlayer } from "../../../games/engine/GamePlayer";
import { createSeededRng } from "../../../games/engine/types";
import type { GameModule } from "../../../games/engine/types";
import { gameByKey } from "../../../games/registry";
import { DexiePatientRepository } from "../../../db/repo/patient";
import { currentPatient } from "./GamesPage";
const challengeKey = `games-challenge:${new Date().toISOString().slice(0, 10)}`;
export function GamePage() {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const { gameKey = "" } = useParams();
  const [data, setData] = useState<{
    game: GameDefinitionDto;
    patientId: string;
    sessionCapMinutes: number;
    content: ContentPack;
  } | null>(null);
  useEffect(() => {
    void Promise.all([listGames(), currentPatient()])
      .then(async ([items, patient]) => {
        const content = await loadContentPack(patient.region, patient.language);
        const places = [
          ...(content.places ?? []),
          ...(patient.knownPlaces ?? []).map((title, index) => ({
            id: `known:${index}`,
            title,
            imageUrl: "",
          })),
        ];
        const game = items.find((item) => item.key === gameKey);
        if (!game) {
          setFailed(true);
          return;
        }
        setData({
          game: {
            ...game,
            name: gameLabel(game.key, game.name, patient.region),
          },
          patientId: patient.id,
          sessionCapMinutes: patient.sessionCapMinutes,
          content: {
            ...content,
            places,
            family: (await new DexiePatientRepository().getFamilyMembers()).map(
              (member) => ({
                id: member.id,
                title: member.name,
                relationship: member.relationship,
                imageUrl: member.photoUrl ?? "",
              }),
            ),
          },
        });
      })
      .catch(() => setFailed(true));
  }, [gameKey]);
  if (failed) return <p>{t("games.unavailable")}</p>;
  if (!data) return <p>{t("games.loading")}</p>;
  const shared = {
    guestMode: new URLSearchParams(window.location.search).get("practice") === "true",
    challengeMode: sessionStorage.getItem(challengeKey) === "true",
    content: data.content,
    game: data.game,
    patientId: data.patientId,
    sessionCapMinutes: data.sessionCapMinutes,
  };
  const module = gameByKey(gameKey);
  if (module) {
    try {
      module.buildRound(1, createSeededRng("availability"), data.content);
    } catch {
      return <p>{t("games.unavailable")}</p>;
    }
    return (
      <GamePlayer
        {...shared}
        module={module as unknown as GameModule<unknown>}
      />
    );
  }
  return <p>{t("games.unavailable")}</p>;
}
