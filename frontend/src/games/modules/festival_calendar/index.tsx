import { definition, choose } from "../new_games";
export const festivalCalendar = definition(
  "festival_calendar",
  "Festival Match",
  ["recognition", "memory"],
  (level, rng, content) => {
    let field = level >= 7 ? "state" : level >= 4 ? "month" : "season";
    if (
      new Set(
        content.festivals
          .map((item) => item.tags?.[field])
          .filter((value) => typeof value === "string"),
      ).size < 2
    )
      field = "season";
    const festivals = content.festivals.filter(
      (item) => typeof item.tags?.[field] === "string",
    );
    if (festivals.length < 2) throw new Error("Festival metadata required");
    const selected = rng.shuffle(festivals)[0]!;
    const labels = [
      ...new Set(festivals.map((item) => String(item.tags![field]))),
    ];
    const options = choose(
      labels.map((title) => ({ id: title, title, imageUrl: "" })),
      level,
      rng,
    );
    if (!options.some((item) => item.id === selected.tags![field]))
      options[0] = {
        id: String(selected.tags![field]),
        title: String(selected.tags![field]),
        imageUrl: "",
      };
    return {
      prompt: "newGames.festival",
      choices: options,
      expected: [String(selected.tags![field])],
      image: selected.imageUrl,
      promptText: selected.title,
    };
  },
);
