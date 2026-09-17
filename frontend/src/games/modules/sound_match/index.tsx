import { definition, choose } from "../new_games";
export const soundMatch = definition(
  "sound_match",
  "Sound Match",
  ["recognition", "memory"],
  (level, rng, content) => {
    const sounds = (content.sounds ?? []).filter(
      (item) => item.audioUrl && item.imageUrl,
    );
    if (sounds.length < 2) throw new Error("Sound images and audio required");
    const choices = choose(sounds, level, rng);
    const expected = rng.shuffle(choices).slice(0, level >= 6 ? 2 : 1);
    return {
      prompt: "newGames.sound",
      choices,
      expected: expected.map((item) => item.id),
      audio: expected.map((item) => item.audioUrl!),
    };
  },
);
