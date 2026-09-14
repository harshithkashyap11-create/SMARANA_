/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import type { ContentPack } from "../../../content/packs";
import type {
  Answer,
  GameModule,
  RoundProps,
  SeededRng,
} from "../../engine/types";
export interface DailySequenceRound {
  activity: string;
  steps: Array<{ id: string; title: string; imageUrl: string }>;
  correctOrder: string[];
}
export const stepCountFor = (level: number) =>
  Math.min(7, 3 + Math.floor(((level - 1) * 4) / 9));
export function buildDailySequenceRound(
  level: number,
  rng: SeededRng,
  content: ContentPack,
): DailySequenceRound {
  const activity = content.activities[rng.int(content.activities.length)]!;
  const steps = activity.steps.slice(0, stepCountFor(level));
  return {
    activity: activity.title,
    correctOrder: steps.map((step) => step.id),
    steps: rng.shuffle(steps),
  };
}
export function DailyLifeSequencingRound({
  round,
  onAnswer,
  onHint,
}: RoundProps<DailySequenceRound>) {
  const [picked, setPicked] = useState<string[]>([]);
  const choose = (id: string) => {
    if (picked.includes(id)) return;
    const next = [...picked, id];
    setPicked(next);
    if (next.length === round.steps.length) onAnswer({ value: next });
  };
  return (
    <section>
      <h2 className="mb-3 text-2xl">{round.activity}</h2>
      <ol className="mb-4 space-y-2">
        {picked.map((id, index) => (
          <li className="rounded-card bg-success/20 p-3" key={id}>
            {index + 1}. {round.steps.find((step) => step.id === id)?.title}
          </li>
        ))}
      </ol>
      <div className="grid gap-3">
        {round.steps
          .filter((step) => !picked.includes(step.id))
          .map((step) => (
            <button
              className="min-h-touch rounded-card border-2 border-primary p-3 text-left"
              key={step.id}
              type="button"
              onClick={() => choose(step.id)}
            >
              {step.title}
            </button>
          ))}
      </div>
      <button
        className="mt-4 min-h-touch rounded-card border-2 border-primary px-5"
        type="button"
        onClick={onHint}
      >
        💡 Show me
      </button>
    </section>
  );
}
export const dailyLifeSequencing: GameModule<DailySequenceRound> = {
  key: "daily_life_sequencing",
  name: "Daily Life Sequencing",
  domains: ["routine", "sequencing"],
  roundsForLevel: (level) => 4 + Math.floor(level / 2),
  buildRound: buildDailySequenceRound,
  Render: DailyLifeSequencingRound,
  score: (round, answer: Answer) => {
    if (!Array.isArray(answer.value)) return { correct: false, partial: 0 };
    const matched = answer.value.filter(
      (id, index) => id === round.correctOrder[index],
    ).length;
    return {
      correct: matched === round.correctOrder.length,
      partial: matched / round.correctOrder.length,
    };
  },
};
