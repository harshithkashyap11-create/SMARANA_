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

type SortingItem = ContentPack["sortingItems"][number] & {
  distractor?: boolean;
};
export interface SortingRound {
  categories: string[];
  items: SortingItem[];
}
export const categoryCountFor = (level: number) =>
  Math.min(4, 2 + Math.floor((level - 1) / 3));
export const itemCountFor = (level: number) =>
  Math.min(14, 4 + Math.floor(((level - 1) * 10) / 9));
export function buildSortingRound(
  level: number,
  rng: SeededRng,
  content: ContentPack,
): SortingRound {
  const categories = [
    ...new Set(content.sortingItems.map((item) => item.category)),
  ].slice(0, categoryCountFor(level));
  const eligible = content.sortingItems.filter((item) =>
    categories.includes(item.category),
  );
  const count = itemCountFor(level);
  const base = Array.from({ length: count }, (_, index) => ({
    ...eligible[index % eligible.length]!,
  }));
  const distractors =
    level >= 6
      ? rng
          .shuffle(content.sortingItems)
          .slice(0, 2)
          .map((item) => ({ ...item, distractor: true }))
      : [];
  return { categories, items: rng.shuffle([...base, ...distractors]) };
}
export function ObjectSortingRound({
  round,
  onAnswer,
  onHint,
}: RoundProps<SortingRound>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SortingItem | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const keyFor = (item: SortingItem, index: number) => `${item.id}-${index}`;
  const submitPlacement = (
    item: SortingItem,
    category: string,
    key: string,
  ) => {
    const correct = item.distractor
      ? category === "Does not belong"
      : category === item.category;
    if (!correct) {
      setMistakes((value) => value + 1);
      return;
    }
    const next = [...placed, key];
    setPlaced(next);
    setSelected(null);
    if (next.length === round.items.length)
      onAnswer({ value: mistakes === 0, extra: { mistakes } });
  };
  const place = (category: string) => {
    if (!selected) return;
    const index = round.items.indexOf(selected);
    submitPlacement(selected, category, keyFor(selected, index));
  };
  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-2">
        {round.items.map((item, index) => (
          <button
            draggable
            key={`${item.id}-${index}`}
            hidden={placed.includes(keyFor(item, index))}
            type="button"
            aria-pressed={selected === item}
            className="min-h-touch rounded-card border-2 border-primary p-3"
            onClick={() => setSelected(item)}
            onDragStart={(event) =>
              event.dataTransfer.setData("item-index", String(index))
            }
          >
            <img
              alt={item.title}
              className="mx-auto h-16"
              src={item.imageUrl}
            />
            {item.title}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ...round.categories,
          ...(round.items.some((item) => item.distractor)
            ? ["Does not belong"]
            : []),
        ].map((category) => (
          <button
            key={
              category === "Does not belong"
                ? t("gameInstructions.noGroup")
                : category
            }
            type="button"
            className="min-h-touch rounded-card bg-primary p-4 text-primary-text"
            onClick={() => place(category)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const item =
                round.items[Number(event.dataTransfer.getData("item-index"))];
              if (item)
                submitPlacement(
                  item,
                  category,
                  keyFor(item, round.items.indexOf(item)),
                );
            }}
          >
            {category === "Does not belong"
              ? t("gameInstructions.noGroup")
              : category}
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
export const objectSorting: GameModule<SortingRound> = {
  key: "object_sorting",
  name: "Object Sorting",
  domains: ["recognition", "attention"],
  roundsForLevel: (level) => 4 + Math.floor(level / 2),
  buildRound: buildSortingRound,
  Render: ObjectSortingRound,
  score: (_round, answer: Answer) => ({
    correct: answer.value === true,
  }),
};
