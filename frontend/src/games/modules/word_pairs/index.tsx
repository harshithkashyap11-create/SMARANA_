import { definition } from "../new_games";
export const wordPairs = definition(
  "word_pairs",
  "Word Pairs",
  ["memory", "language"],
  (level, rng, content) => {
    const words = rng
      .shuffle(content.words ?? content.sequenceItems)
      .filter(
        (item, index, all) =>
          all.findIndex((other) => other.title === item.title) === index,
      )
      .slice(0, Math.min(16, 2 * (3 + Math.floor(((level - 1) * 5) / 9))));
    if (words.length < 6) throw new Error("At least six words required");
    const pairs = Array.from(
      { length: Math.floor(words.length / 2) },
      (_, index) => [words[index * 2]!, words[index * 2 + 1]!] as const,
    );
    const selected = pairs[rng.int(pairs.length)]!;
    return {
      prompt: "newGames.word",
      choices: rng.shuffle(pairs.map((pair) => ({ ...pair[1], imageUrl: "" }))),
      expected: [selected[1].id],
      preview: pairs.map((pair) => `${pair[0].title} — ${pair[1].title}`),
      previewMs: Math.max(2500, 6000 - level * 250),
      delay: 600 + level * 250,
      image: undefined,
      ...{ promptText: selected[0].title },
    };
  },
);
