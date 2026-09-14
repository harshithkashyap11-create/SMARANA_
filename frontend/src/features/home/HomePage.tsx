import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { BigButton } from "../../shared/ui/BigButton";
import { Card } from "../../shared/ui/Card";
import { IconTile } from "../../shared/ui/IconTile";
import { useThemeStore } from "../../shared/theme/store";

interface HealthResponse {
  status: "ok";
  db: "ok";
}

const scaleNames = {
  1: "comfortable",
  1.2: "large",
  1.4: "larger",
  1.6: "largest",
} as const;

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/v1/health/");

  if (!response.ok) {
    throw new Error("Health request was unavailable");
  }

  const data = (await response.json()) as Partial<HealthResponse>;

  if (data.status !== "ok" || data.db !== "ok") {
    throw new Error("Health response was not ready");
  }

  return data as HealthResponse;
}

function MoonIcon() {
  return <span aria-hidden="true">☾</span>;
}

export function HomePage() {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const fontScale = useThemeStore((state) => state.fontScale);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const cycleFontScale = useThemeStore((state) => state.cycleFontScale);
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth });

  const healthMessage = health.isPending
    ? t("health.loading")
    : health.isError
      ? t("health.unavailable")
      : t("health.ok");

  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col gap-6 px-5 py-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
          {t("app.eyebrow")}
        </p>
        <h1 className="text-3xl font-bold leading-tight">{t("app.title")}</h1>
        <p className="max-w-prose text-muted">{t("app.welcome")}</p>
      </header>

      <Card aria-live="polite">
        <p className="font-semibold">{t("health.title")}</p>
        <p className="mt-2 text-muted">{healthMessage}</p>
      </Card>

      <section aria-labelledby="preferences-title" className="space-y-4">
        <h2 id="preferences-title" className="text-2xl font-bold">
          {t("preferences.title")}
        </h2>
        <div
          className={`grid grid-cols-1 gap-3 ${fontScale < 1.4 ? "sm:grid-cols-2" : ""}`}
        >
          <IconTile
            icon={<MoonIcon />}
            label={t("preferences.themeValue", {
              theme: t(`preferences.themes.${theme}`),
            })}
            onClick={toggleTheme}
          />
          <BigButton variant="secondary" onClick={cycleFontScale}>
            {t("preferences.fontScale", {
              scale: t(`preferences.scales.${scaleNames[fontScale]}`),
            })}
          </BigButton>
        </div>
      </section>
    </main>
  );
}
