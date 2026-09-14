import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useNavigate } from "react-router-dom";

import type { RoleEnum } from "../../api/generated/models";
import { useAuthStore } from "../../features/auth/authStore";
import { useIdleLogout } from "../../shared/hooks/useIdleLogout";

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
  return (
    <main className="mx-auto min-h-screen max-w-[720px] p-4">
      <Outlet />
    </main>
  );
}

export function RoleHome({ role }: { role: RoleEnum }) {
  const { t } = useTranslation();
  return <h1 className="text-3xl font-bold">{t(`auth.layout.${role}`)}</h1>;
}
