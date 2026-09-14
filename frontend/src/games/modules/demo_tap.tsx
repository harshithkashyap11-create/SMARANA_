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
  Render: ({ round, onAnswer, onHint }) => (
    <div>
      <button type="button" onClick={() => onAnswer({ value: round.expected })}>
        Tap
      </button>
      <button type="button" onClick={onHint}>
        Hint
      </button>
    </div>
  ),
};
