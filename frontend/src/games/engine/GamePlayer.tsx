import { useTranslation } from "react-i18next";
import type { ContentPack } from "../../content/packs";
import type { GameDefinitionDto } from "../../db/repo/games";
import type { GameModule } from "./types";
import { SupportiveEndScreen } from "./SupportiveEndScreen";
import { useGameSession } from "./useGameSession";

export function GamePlayer<R>({
  module,
  game,
  patientId,
  content,
  challengeMode,
}: {
  module: GameModule<R>;
  game: GameDefinitionDto;
  patientId: string;
  content: ContentPack;
  challengeMode: boolean;
}) {
  const { t } = useTranslation();
  const session = useGameSession(
    module,
    game,
    patientId,
    content,
    challengeMode,
  );
  if (session.messageKey)
    return (
      <SupportiveEndScreen
        messageKey={session.messageKey}
        onReplay={() => session.restart()}
      />
    );
  if (!session.ready || !session.round) return <p>{t("games.loading")}</p>;
  const Render = module.Render;
  return (
    <section>
      <h1 className="mb-2 text-3xl font-bold">{module.name}</h1>
      <p className="mb-5">
        {t("games.round", {
          current: session.roundIndex + 1,
          total: session.totalRounds,
        })}
      </p>
      <Render
        round={session.round}
        onAnswer={(answer) => session.answer(answer)}
        onHint={() => session.hint()}
      />
    </section>
  );
}
