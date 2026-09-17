/* eslint-disable react-refresh/only-export-components -- a game module intentionally colocates its renderer and pure rules. */
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { ContentItem } from "../../../content/packs";
import type {
  Answer,
  GameModule,
  RoundProps,
  SeededRng,
} from "../../engine/types";

export interface SequenceRound {
  items: ContentItem[];
  sequence: string[];
  playbackMs: number;
}
export function sequenceLengthFor(level: number): number {
  return Math.min(8, 2 + Math.floor(((level - 1) * 6) / 9));
}
export function setSizeFor(level: number): number {
  return Math.min(8, 3 + Math.floor(((level - 1) * 5) / 9));
}
export function buildSequenceRound(
  level: number,
  rng: SeededRng,
  items: ContentItem[],
): SequenceRound {
  const chosen = rng.shuffle(items).slice(0, setSizeFor(level));
  return {
    items: chosen,
    sequence: Array.from(
      { length: sequenceLengthFor(level) },
      () => chosen[rng.int(chosen.length)]!.id,
    ),
    playbackMs: Math.max(450, 1000 - level * 55),
  };
}
export function SequenceRecallRound({
  round,
  onAnswer,
  onHint,
}: RoundProps<SequenceRound>) {
  const { t } = useTranslation();
  const [showing, setShowing] = useState(true);
  const [position, setPosition] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const replay = (): void => {
    setShowing(true);
    setPosition(0);
  };
  useEffect(() => {
    if (!showing) return;
    const timer = window.setTimeout(() => {
      if (position + 1 >= round.sequence.length) setShowing(false);
      else setPosition((old) => old + 1);
    }, round.playbackMs);
    return () => window.clearTimeout(timer);
  }, [position, round.playbackMs, round.sequence.length, showing]);
  const choose = (id: string): void => {
    const next = [...picked, id];
    setPicked(next);
    if (next.length === round.sequence.length) onAnswer({ value: next });
  };
  return (
    <section>
      {showing ? (
        <div
          aria-live="polite"
          className="mx-auto mb-6 min-h-32 w-32 rounded-card"
          style={{
            background: round.items.find(
              (item) => item.id === round.sequence[position],
            )?.color,
          }}
        >
          <span className="sr-only">
            {
              round.items.find((item) => item.id === round.sequence[position])
                ?.title
            }
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {round.items.map((item) => (
            <button
              aria-label={item.title}
              className="min-h-touch rounded-card border-2 border-primary p-4"
              key={item.id}
              style={{ background: item.color }}
              type="button"
              onClick={() => choose(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
      <button
        className="mt-4 min-h-touch rounded-card border-2 border-primary px-5"
        type="button"
        onClick={() => {
          onHint();
          replay();
        }}
      >
        {t("gameInstructions.showMe")}
      </button>
    </section>
  );
}
export const sequenceRecall: GameModule<SequenceRound> = {
  key: "sequence_recall",
  name: "Sequence Recall",
  domains: ["memory", "sequencing"],
  roundsForLevel: (level) => 4 + Math.floor(level / 2),
  buildRound: (level, rng, content) =>
    buildSequenceRound(level, rng, content.sequenceItems),
  Render: SequenceRecallRound,
  score: (round, answer: Answer) => ({
    correct:
      Array.isArray(answer.value) &&
      answer.value.join("|") === round.sequence.join("|"),
  }),
};
