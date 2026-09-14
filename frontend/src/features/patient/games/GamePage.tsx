import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadContentPack, type ContentPack } from "../../../content/packs";
import { listGames, type GameDefinitionDto } from "../../../db/repo/games";
import { GamePlayer } from "../../../games/engine/GamePlayer";
import { memoryMatch } from "../../../games/modules/memory_match";
import { sequenceRecall } from "../../../games/modules/sequence_recall";
import { currentPatientId } from "./GamesPage";
const challengeKey = `games-challenge:${new Date().toISOString().slice(0, 10)}`;
export function GamePage() {
  const { gameKey = "" } = useParams();
  const [data, setData] = useState<{
    game: GameDefinitionDto;
    patientId: string;
    content: ContentPack;
  } | null>(null);
  useEffect(() => {
    void Promise.all([listGames(), currentPatientId(), loadContentPack()]).then(
      ([items, patientId, content]) => {
        const game = items.find((item) => item.key === gameKey);
        if (game) setData({ game, patientId, content });
      },
    );
  }, [gameKey]);
  if (!data) return <p>One moment…</p>;
  const shared = {
    challengeMode: sessionStorage.getItem(challengeKey) === "true",
    content: data.content,
    game: data.game,
    patientId: data.patientId,
  };
  if (gameKey === memoryMatch.key)
    return <GamePlayer {...shared} module={memoryMatch} />;
  if (gameKey === sequenceRecall.key)
    return <GamePlayer {...shared} module={sequenceRecall} />;
  return <p>Game unavailable.</p>;
}
