import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Django retains its staff authentication and OTP checks inside the same-origin portal.
export function AdminPortalPage() {
  const { t } = useTranslation();
  return <main className="flex h-screen flex-col bg-background">
    <header className="flex items-center gap-6 border-b p-4">
      <Link className="min-h-touch text-primary underline" to="/">{t("auth.back")}</Link>
      <h1 className="text-xl font-bold">{t("landing.admin")} · {t("app.title")}</h1>
    </header>
    <iframe className="min-h-0 w-full flex-1 border-0" src="/admin/" title={t("landing.admin")} />
  </main>;
}
