import type { ContentItem } from "../../../content/packs";
import { definition } from "../new_games";
export const spotTheChange = definition(
  "spot_the_change",
  "Spot the Change",
  ["attention"],
  (level, rng, content) => {
    const scenes = content.routineScenes.filter(
      (item) => Array.isArray(item.tags?.variants) && item.tags.variants.length,
    );
    if (!scenes.length) throw new Error("Scene variants required");
    const scene = scenes[rng.int(scenes.length)]!;
    const variants = scene.tags!.variants as Array<{
      imageUrl: string;
      differences: ContentItem[];
    }>;
    const count = 1 + Math.floor((level - 1) / 3);
    const eligible = variants.filter(
      (item) => item.differences.length <= count,
    );
    const available = eligible.length ? eligible : variants;
    const targetCount = eligible.length
      ? Math.max(...eligible.map((item) => item.differences.length))
      : Math.min(...variants.map((item) => item.differences.length));
    const variant = rng.shuffle(
      available.filter((item) => item.differences.length === targetCount),
    )[0]!;
    const choices = rng.shuffle([
      ...variant.differences,
      ...scene.distractors
        .filter(
          (title) => !variant.differences.some((item) => item.title === title),
        )
        .slice(0, 3)
        .map((title) => ({ id: title, title, imageUrl: "" })),
    ]);
    return {
      prompt: "newGames.change",
      choices,
      expected: variant.differences.map((item) => item.id),
      image: scene.imageUrl,
      secondImage: variant.imageUrl,
    };
  },
);
