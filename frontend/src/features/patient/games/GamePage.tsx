import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadContentPack, type ContentPack } from "../../../content/packs";
import { listGames, type GameDefinitionDto } from "../../../db/repo/games";
import { GamePlayer } from "../../../games/engine/GamePlayer";
import type { GameModule } from "../../../games/engine/types";
import { gameByKey } from "../../../games/registry";
import { currentPatient } from "./GamesPage";
const challengeKey = `games-challenge:${new Date().toISOString().slice(0, 10)}`;
export function GamePage() {
  const { gameKey = "" } = useParams();
  const [data, setData] = useState<{
    game: GameDefinitionDto;
    patientId: string;
    sessionCapMinutes: number;
    content: ContentPack;
  } | null>(null);
  useEffect(() => {
    void Promise.all([listGames(), currentPatient()]).then(
      async ([items, patient]) => {
        const content = await loadContentPack(patient.region, patient.language);
        const game = items.find((item) => item.key === gameKey);
        if (game)
          setData({
            game,
            patientId: patient.id,
            sessionCapMinutes: patient.sessionCapMinutes,
            content,
          });
      },
    );
  }, [gameKey]);
  if (!data) return <p>One moment…</p>;
  const shared = {
    challengeMode: sessionStorage.getItem(challengeKey) === "true",
    content: data.content,
    game: data.game,
    patientId: data.patientId,
    sessionCapMinutes: data.sessionCapMinutes,
  };
  const module = gameByKey(gameKey);
  if (module)
    return (
      <GamePlayer
        {...shared}
        module={module as unknown as GameModule<unknown>}
      />
    );
  return <p>Game unavailable.</p>;
}
