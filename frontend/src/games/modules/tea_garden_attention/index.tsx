/* eslint-disable react-refresh/only-export-components */
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { ContentPack } from "../../../content/packs";
import type {
  Answer,
  GameModule,
  RoundProps,
  SeededRng,
} from "../../engine/types";
export interface AttentionRound {
  sceneTitle: string;
  targets: string[];
  objects: Array<{
    id: string;
    label: string;
    target: boolean;
    x: number;
    y: number;
  }>;
  timeLimitMs?: number;
}
export const targetCountFor = (level: number) =>
  Math.min(6, 2 + Math.floor((level - 1) / 2));
export function buildAttentionRound(
  level: number,
  rng: SeededRng,
  content: ContentPack,
): AttentionRound {
  const scene = content.routineScenes[rng.int(content.routineScenes.length)]!;
  const targets = rng.shuffle(scene.targets).slice(0, targetCountFor(level));
  const distractorCount = 2 + level;
  const labels = [
    ...targets.map((label) => ({ label, target: true })),
    ...Array.from({ length: distractorCount }, (_, i) => ({
      label: scene.distractors[i % scene.distractors.length]!,
      target: false,
    })),
  ];
  return {
    sceneTitle: scene.title,
    targets,
    objects: rng.shuffle(labels).map((item, index) => ({
      ...item,
      id: `${item.label}-${index}`,
      x: 8 + rng.int(80),
      y: 8 + rng.int(70),
    })),
    ...(level >= 4
      ? { timeLimitMs: Math.max(30000, 65000 - level * 3500) }
      : {}),
  };
}
export function TeaGardenAttentionRound({
  round,
  onAnswer,
  onHint,
}: RoundProps<AttentionRound>) {
  const { t } = useTranslation();
  const [found, setFound] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  return (
    <section>
      <p className="mb-3 text-xl">
        {t("gameInstructions.find", { items: round.targets.join(", ") })}
      </p>
      {round.timeLimitMs && (
        <div
          aria-label={t("gameInstructions.timeRemaining")}
          className="mb-3 h-2 rounded bg-primary/30"
        >
          <div className="h-2 w-3/4 rounded bg-primary" />
        </div>
      )}
      <div
        aria-label={round.sceneTitle}
        className="attention-scene relative min-h-96 overflow-hidden rounded-card bg-success/20"
      >
        {round.objects.map((object) => (
          <button
            key={object.id}
            type="button"
            aria-label={object.label}
            disabled={found.includes(object.id)}
            className="absolute min-h-touch min-w-touch rounded-full border-2 border-primary bg-surface p-2"
            style={{ left: `${object.x}%`, top: `${object.y}%` }}
            onClick={() => {
              if (!object.target) {
                setMistakes((value) => value + 1);
                return;
              }
              const next = [...found, object.id];
              setFound(next);
              if (next.length === round.targets.length)
                onAnswer({ value: mistakes === 0, extra: { mistakes } });
            }}
          >
            {found.includes(object.id) ? "✓" : object.label}
          </button>
        ))}
      </div>
      <button
        className="mt-4 min-h-touch rounded-card border-2 border-primary px-5"
        type="button"
        onClick={onHint}
      >
        {t("gameInstructions.showMe")}
      </button>
    </section>
  );
}
export const teaGardenAttention: GameModule<AttentionRound> = {
  key: "tea_garden_attention",
  name: "Tea Garden Attention",
  domains: ["attention"],
  roundsForLevel: (level) => 4 + Math.floor(level / 2),
  buildRound: buildAttentionRound,
  Render: TeaGardenAttentionRound,
  score: (_round, answer: Answer) => ({ correct: answer.value === true }),
};
