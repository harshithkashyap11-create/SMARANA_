import { PrivateImage } from "../../../shared/ui/PrivateImage";
/* eslint-disable react-refresh/only-export-components -- a game module intentionally colocates its renderer and pure rules. */
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import type { ContentItem } from "../../../content/packs";
import type {
  Answer,
  GameModule,
  RoundProps,
  SeededRng,
} from "../../engine/types";

export interface MemoryCard extends ContentItem {
  cardId: string;
}
export interface MemoryRound {
  cards: MemoryCard[];
  previewMs: number;
  pairCount: number;
}
export function gridFor(level: number): [number, number] {
  if (level <= 2) return [2, 2];
  if (level <= 4) return [2, 3];
  if (level <= 6) return [3, 4];
  if (level <= 8) return [4, 4];
  return [4, 5];
}
export function previewMsFor(level: number): number {
  return Math.round(4000 - ((Math.min(10, Math.max(1, level)) - 1) / 9) * 3000);
}

export function buildMemoryRound(
  level: number,
  rng: SeededRng,
  items: ContentItem[],
): MemoryRound {
  const [rows, columns] = gridFor(level);
  const pairCount = Math.min(items.length, (rows * columns) / 2);
  const chosen = rng.shuffle(items).slice(0, pairCount);
  return {
    pairCount,
    previewMs: previewMsFor(level),
    cards: rng.shuffle(
      chosen.flatMap((item) => [
        { ...item, cardId: `${item.id}-a` },
        { ...item, cardId: `${item.id}-b` },
      ]),
    ),
  };
}
export function MemoryMatchRound({
  round,
  onAnswer,
  onHint,
}: RoundProps<MemoryRound>) {
  const { t } = useTranslation();
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );
  const [revealed, setRevealed] = useState<string[]>(
    round.cards.map((card) => card.cardId),
  );
  const [matched, setMatched] = useState<string[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed([]), round.previewMs);
    return () => window.clearTimeout(timer);
  }, [round.previewMs]);
  const flip = (card: MemoryCard): void => {
    if (revealed.includes(card.cardId) || matched.includes(card.id)) return;
    const next = [...revealed, card.cardId];
    setRevealed(next);
    if (next.length === 2) {
      const cards = next.map((id) =>
        round.cards.find((item) => item.cardId === id),
      );
      const correct = cards[0]?.id === cards[1]?.id;
      timers.current.push(
        window.setTimeout(() => {
          setRevealed([]);
          if (correct && cards[0]) setMatched((old) => [...old, cards[0]!.id]);
          onAnswer({ value: correct });
        }, 250),
      );
    }
  };
  const hint = (): void => {
    onHint();
    setRevealed(round.cards.map((card) => card.cardId));
    timers.current.push(window.setTimeout(() => setRevealed([]), 900));
  };
  return (
    <section>
      <div className="grid grid-cols-4 gap-3">
        {round.cards.map((card) => {
          const faceUp =
            revealed.includes(card.cardId) || matched.includes(card.id);
          return (
            <button
              aria-label={
                faceUp ? card.title : t("gameInstructions.hiddenCard")
              }
              className="min-h-touch rounded-card border-2 border-primary bg-surface p-2"
              key={card.cardId}
              type="button"
              onClick={() => flip(card)}
            >
              {faceUp ? (
                <PrivateImage
                  alt={card.title}
                  className="h-20 w-full object-contain"
                  src={card.imageUrl}
                />
              ) : (
                <span className="text-3xl">?</span>
              )}
            </button>
          );
        })}
      </div>
      <button
        className="mt-4 min-h-touch rounded-card border-2 border-primary px-5"
        type="button"
        onClick={hint}
      >
        {t("gameInstructions.showMe")}
      </button>
    </section>
  );
}
export const memoryMatch: GameModule<MemoryRound> = {
  key: "memory_match",
  name: "Memory Match",
  domains: ["memory", "attention"],
  roundsForLevel: (level) => 4 + Math.floor(level / 2),
  buildRound: (level, rng, content) =>
    buildMemoryRound(level, rng, [...content.dishes, ...content.festivals]),
  Render: MemoryMatchRound,
  score: (_round, answer: Answer) => ({ correct: answer.value === true }),
};
