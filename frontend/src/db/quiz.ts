import type {
  CachedFamilyMember,
  CachedMemory,
  CachedQuizAttempt,
} from "./schema";
import type { QuizQuestion } from "./repo/memories";
import { i18n } from "../shared/i18n";

export function offlineQuestion(
  memories: CachedMemory[],
  family: CachedFamilyMember[],
  attempts: CachedQuizAttempt[],
  useMemories: boolean,
): QuizQuestion {
  const recent = new Set(
    [...attempts]
      .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
      .slice(0, 5)
      .map((x) => x.memoryId),
  );
  const ordered = memories.filter(
    (x) => x.visibility === "quiz" && !recent.has(x.id),
  );
  const choices = (expected: string, alternatives: string[]) =>
    [...new Set([expected, ...alternatives.filter(Boolean)])]
      .slice(0, 3)
      .sort((a, b) => a.localeCompare(b));
  if (useMemories)
    for (const memory of ordered) {
      const person = memory.people[0];
      const type = person
        ? "who"
        : memory.occurredOn
          ? "when"
          : memory.place
            ? "where"
            : memory.occasion
              ? "occasion"
              : null;
      if (!type) continue;
      const expected =
        person?.name ??
        (type === "when"
          ? memory.occurredOn!.slice(0, 4)
          : type === "where"
            ? memory.place
            : i18n.t(`quiz.occasions.${memory.occasion}`));
      const alternatives =
        type === "who"
          ? family.map((x) => x.name)
          : type === "when"
            ? [String(Number(expected) - 1), String(Number(expected) + 1)]
            : type === "where"
              ? memories.map((x) => x.place)
              : [
                  "birthday",
                  "festival",
                  "wedding",
                  "trip",
                  "daily",
                  "other",
                ].map((x) => i18n.t(`quiz.occasions.${x}`));
      return {
        memory_id: memory.id,
        question_type: type,
        prompt: i18n.t(`quiz.prompt.${type}`),
        expected_label: expected,
        options: choices(expected, alternatives),
        media_url: memory.media.find((x) => x.kind === "photo")?.url ?? null,
      };
    }
  const person = family[attempts.length % Math.max(family.length, 1)];
  return {
    memory_id: null,
    question_type: "who",
    prompt: i18n.t("quiz.prompt.who"),
    expected_label: person?.name ?? "",
    options: person
      ? choices(
          person.name,
          family.map((x) => x.name),
        )
      : [],
    media_url: person?.photoUrl ?? null,
  };
}
