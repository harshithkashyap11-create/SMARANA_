import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useNavigate } from "react-router-dom";

import type { RoleEnum } from "../../api/generated/models";
import { useAuthStore } from "../../features/auth/authStore";
import { useIdleLogout } from "../../shared/hooks/useIdleLogout";
import { useIdlePrompt } from "../../shared/hooks/useIdlePrompt";
import { ConfirmDialog } from "../../shared/ui";

export function RequireRole({
  allowed,
  children,
}: PropsWithChildren<{ allowed: RoleEnum[] }>) {
  const role = useAuthStore((state) => state.role);
  return role && allowed.includes(role) ? (
    children
  ) : (
    <Navigate replace to="/" />
  );
}

export function ProLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  useIdleLogout();

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="flex min-h-[64px] items-center justify-between bg-surface px-5">
        <strong>{user?.display_name}</strong>
        <button
          className="min-h-[44px] px-3"
          type="button"
          onClick={() => void logout().then(() => navigate("/"))}
        >
          {t("auth.logout")}
        </button>
      </header>
      <div className="mx-auto grid max-w-5xl gap-4 p-5 md:grid-cols-[12rem_1fr]">
        <nav
          aria-label={t("auth.navigation")}
          className="rounded-card bg-surface p-4"
        >
          {t("auth.dashboard")}
        </nav>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PatientLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const { confirmPresence, isPromptOpen } = useIdlePrompt(30 * 60 * 1000);
  const navItems = ["home", "play", "wellness", "family", "settings"] as const;
  const navRoutes = [
    "/patient",
    "/patient/games",
    "/patient/calm",
    "/patient/people",
    "/patient/settings",
  ] as const;

  const leave = (): void => {
    void logout().then(() => navigate("/", { replace: true }));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col bg-bg text-text">
      <header className="sticky top-0 z-10 grid min-h-touch grid-cols-[1fr_auto_1fr] items-center gap-2 bg-surface px-3 shadow-card">
        <button
          className="min-h-touch justify-self-start px-2 font-bold"
          type="button"
          onClick={() => navigate(-1)}
        >
          ← {t("auth.back")}
        </button>
        <strong className="text-center">{t("patient.title")}</strong>
        <button
          className="min-h-touch justify-self-end px-2 font-bold"
          type="button"
        >
          ◖)) {t("patient.talk")}
        </button>
      </header>
      <main className="flex-1 p-4 pb-24">
        <Outlet />
      </main>
      <nav
        aria-label={t("patient.navigation")}
        className="fixed inset-x-0 bottom-0 z-10 mx-auto grid min-h-touch max-w-[720px] grid-cols-5 border-t border-primary/20 bg-surface"
      >
        {navItems.map((item, index) => (
          <button
            className="min-h-touch px-1 text-sm font-bold"
            key={item}
            type="button"
            onClick={() => navigate(navRoutes[index] ?? "/patient")}
          >
            <span aria-hidden="true" className="block text-2xl">
              {item === "home"
                ? "⌂"
                : item === "play"
                  ? "▶"
                  : item === "wellness"
                    ? "♥"
                    : item === "family"
                      ? "♧"
                      : "⚙"}
            </span>
            {t(`patient.nav.${item}`)}
          </button>
        ))}
      </nav>
      <ConfirmDialog
        noLabel={t("patient.idle.no")}
        open={isPromptOpen}
        title={t("patient.idle.title")}
        ttsLabel={t("patient.listen")}
        yesLabel={t("patient.idle.yes")}
        onNo={leave}
        onYes={confirmPresence}
      />
    </div>
  );
}

export function RoleHome({ role }: { role: RoleEnum }) {
  const { t } = useTranslation();
  return <h1 className="text-3xl font-bold">{t(`auth.layout.${role}`)}</h1>;
}
