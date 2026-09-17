import { useTranslation } from "react-i18next";
import type { GameModule } from "../engine/types";

interface DemoRound {
  expected: number;
}

export const demoTap: GameModule<DemoRound> = {
  key: "demo_tap",
  name: "Demo Tap",
  domains: ["attention"],
  roundsForLevel: () => 3,
  buildRound: (_level, rng) => ({ expected: rng.int(2) }),
  score: (round, answer) => ({ correct: answer.value === round.expected }),
  Render: function DemoTapView({ round, onAnswer, onHint }) {
    const { t } = useTranslation();
    return (
    <div>
      <button type="button" onClick={() => onAnswer({ value: round.expected })}>
        {t("gameInstructions.tapButton")}
      </button>
      <button type="button" onClick={onHint}>
        {t("gameInstructions.hint")}
      </button>
    </div>
  ); },
};
