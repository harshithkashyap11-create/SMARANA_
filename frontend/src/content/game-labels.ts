import { i18n } from "../shared/i18n";
export function gameLabel(
  key: string,
  fallback: string,
  region = "AS",
): string {
  if (key === "bihu_rhythm_recall")
    return i18n.t(
      region === "ML"
        ? "games.rhythmMeghalaya"
        : region === "AS"
          ? "games.rhythmAssam"
          : "games.rhythmGeneric",
    );
  const translation = `gameNames.${key}`;
  return i18n.exists(translation) ? i18n.t(translation) : fallback;
}
