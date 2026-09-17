import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { supportedLanguages, languageNames } from "../../shared/i18n";
import { useThemeStore } from "../../shared/theme/store";
import { IconTile } from "../../shared/ui";

export function LandingPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const cycleFontScale = useThemeStore((state) => state.cycleFontScale);


  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col gap-6 px-4 py-8">
      <p className="text-sm text-muted" role="note">{t("localization.notice")}</p>
      <header className="text-center">
        <div aria-hidden="true" className="text-5xl">
          ◉
        </div>
        <h1 className="text-3xl font-bold">{t("app.title")}</h1>
        <p className="text-muted">{t("landing.tagline")}</p>
      </header>
      <Link className="min-h-touch rounded-card bg-surface p-3 text-center underline" to="/register">{t("registration.create")}</Link>
      <section
        aria-label={t("landing.chooseRole")}
        className="grid gap-3 sm:grid-cols-2"
      >
        <IconTile
          icon="♥"
          label={t("landing.patient")}
          onClick={() => void navigate("/login/patient")}
        />
        <IconTile
          icon="◎"
          label={t("landing.caregiver")}
          onClick={() => void navigate("/login/caregiver")}
        />
        <IconTile
          icon="✚"
          label={t("landing.doctor")}
          onClick={() => void navigate("/login/doctor")}
        />
        <IconTile
          icon="⚙"
          label={t("landing.admin")}
          onClick={() => void navigate("/portal/admin")}
        />
      </section>
      <section
        aria-label={t("landing.settings")}
        className="mt-auto grid gap-3 sm:grid-cols-3"
      >
        <div className="rounded-card bg-surface p-3 sm:col-span-3">
          <p className="mb-2">{t("landing.language")}</p>
          <div
            aria-label={t("landing.language")}
            className="grid gap-2 sm:grid-cols-3"
            role="group"
          >
            {supportedLanguages.map((language) => (
              <button
                aria-pressed={i18n.language.split("-")[0] === language}
                className="min-h-touch rounded-card bg-calm px-3 font-semibold text-text"
                key={language}
                onClick={() => void i18n.changeLanguage(language)}
                type="button"
              >
                {languageNames[language]}
              </button>
            ))}
          </div>
        </div>
        <button
          className="min-h-touch rounded-card bg-surface px-4"
          onClick={toggleTheme}
          type="button"
        >
          {t("landing.theme")}
        </button>
        <button
          className="min-h-touch rounded-card bg-surface px-4"
          onClick={cycleFontScale}
          type="button"
        >
          {t("landing.textSize")}
        </button>
      </section>
    </main>
  );
}
