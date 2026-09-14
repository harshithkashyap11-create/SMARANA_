import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useThemeStore } from "../../shared/theme/store";
import { IconTile } from "../../shared/ui";

export function LandingPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const cycleFontScale = useThemeStore((state) => state.cycleFontScale);

  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <div aria-hidden="true" className="text-5xl">
          ◉
        </div>
        <h1 className="text-3xl font-bold">{t("app.title")}</h1>
        <p className="text-muted">{t("landing.tagline")}</p>
      </header>
      <section
        aria-label={t("landing.chooseRole")}
        className="grid gap-3 sm:grid-cols-2"
      >
        <IconTile
          icon="♥"
          label={t("landing.patient")}
          onClick={() => navigate("/login/patient")}
        />
        <IconTile
          icon="◎"
          label={t("landing.caregiver")}
          onClick={() => navigate("/login/caregiver")}
        />
        <IconTile
          icon="✚"
          label={t("landing.doctor")}
          onClick={() => navigate("/login/doctor")}
        />
        <IconTile
          icon="⚙"
          label={t("landing.admin")}
          onClick={() => window.location.assign("/admin/")}
        />
      </section>
      <section
        aria-label={t("landing.settings")}
        className="mt-auto grid gap-3 sm:grid-cols-3"
      >
        <label className="flex min-h-touch items-center gap-2 rounded-card bg-surface px-4">
          <span>{t("landing.language")}</span>
          <select
            className="min-h-[44px] flex-1 bg-surface text-text"
            value={i18n.language.split("-")[0]}
            onChange={(event) => void i18n.changeLanguage(event.target.value)}
          >
            <option value="en">English</option>
            <option value="as">অসমীয়া</option>
            <option value="bn">বাংলা</option>
          </select>
        </label>
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
