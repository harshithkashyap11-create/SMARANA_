import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMeta } from "../../../db/schema";
import { useThemeStore, type FontScale } from "../../../shared/theme/store";
import { currentPatient } from "../games/GamesPage";
import { saveComfortSettings } from "../../../db/accessibility";
export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [locked, setLocked] = useState(false);
  const [slow, setSlow] = useState(false);
  const [region, setRegion] = useState("AS");
  const theme = useThemeStore((state) => state.theme);
  const fontScale = useThemeStore((state) => state.fontScale);
  const setTheme = useThemeStore((state) => state.setTheme);
  const setFontScale = useThemeStore((state) => state.setFontScale);
  useEffect(() => {
    void Promise.all([
      getMeta("languageLocked"),
      getMeta("slowSpeech"),
      currentPatient(),
    ]).then(([a, b, patient]) => {
      setLocked(a === "1");
      setSlow(b === "1");
      setRegion(patient.region);
    });
  }, []);
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
      <label className="block font-bold">
        {t("settings.region")}
        <input
          aria-label={t("settings.region")}
          className="mt-2 min-h-touch w-full rounded-card border-2 border-primary bg-surface px-4"
          readOnly
          value={region}
        />
      </label>
      <p className="text-sm text-muted">{t("settings.caregiverHelp")}</p>
      <label className="block font-bold">
        {t("settings.language")}
        <select
          className="mt-2 min-h-touch w-full rounded-card border-2 border-primary bg-surface px-4"
          disabled={locked}
          value={i18n.resolvedLanguage?.split("-")[0] ?? "en"}
          onChange={(e) => void i18n.changeLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="as">অসমীয়া</option>
          <option value="bn">বাংলা</option>
        </select>
      </label>
      {locked ? <p>{t("settings.lockedHelp")}</p> : null}
      <label className="flex min-h-touch items-center gap-4 font-bold">
        <input
          checked={locked}
          className="h-8 w-8"
          type="checkbox"
          onChange={(e) => {
            setLocked(e.target.checked);
            void saveComfortSettings({ language_locked: e.target.checked });
          }}
        />{" "}
        {t("settings.lock")}
      </label>
      <label className="block font-bold">
        {t("settings.textSize")}
        <select
          className="mt-2 min-h-touch w-full rounded-card border-2 border-primary bg-surface px-4"
          value={fontScale}
          onChange={(e) => {
            const value = Number(e.target.value) as FontScale;
            setFontScale(value);
            void saveComfortSettings({ font_scale: value });
          }}
        >
          <option value="1">{t("settings.standard")}</option>
          <option value="1.2">{t("settings.large")}</option>
          <option value="1.4">{t("settings.larger")}</option>
          <option value="1.6">{t("settings.largest")}</option>
        </select>
      </label>
      <label className="block font-bold">
        {t("settings.theme")}
        <select
          className="mt-2 min-h-touch w-full rounded-card border-2 border-primary bg-surface px-4"
          value={theme}
          onChange={(e) => {
            const value = e.target.value as "light" | "dark";
            setTheme(value);
            void saveComfortSettings({ theme: value });
          }}
        >
          <option value="light">{t("settings.light")}</option>
          <option value="dark">{t("settings.dark")}</option>
        </select>
      </label>
      <label className="flex min-h-touch items-center gap-4 font-bold">
        <input
          checked={slow}
          className="h-8 w-8"
          type="checkbox"
          onChange={(e) => {
            setSlow(e.target.checked);
            void saveComfortSettings({ slow_speech: e.target.checked });
          }}
        />{" "}
        {t("settings.slow")}
      </label>
      <button
        className="min-h-touch rounded-card border-2 border-primary px-4"
        type="button"
        onClick={() => {
          const speech = new SpeechSynthesisUtterance(
            t("settings.instructions"),
          );
          speech.lang = i18n.resolvedLanguage ?? "en";
          window.speechSynthesis?.speak(speech);
        }}
      >
        {t("settings.replay")}
      </button>
    </section>
  );
}
