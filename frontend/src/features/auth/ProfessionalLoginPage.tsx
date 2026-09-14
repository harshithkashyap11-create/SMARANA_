import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import type { RoleEnum } from "../../api/generated/models";
import { useAuthStore } from "./authStore";

function errorCode(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.body &&
    typeof error.body === "object"
  ) {
    const code = (error.body as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "request_not_completed";
}

export function ProfessionalLoginPage({ role }: { role: RoleEnum }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const session = await login({
        email_or_phone: identifier,
        password,
        device_id: "web-browser",
      });
      if (session.user.role !== role) {
        useAuthStore.getState().clearSession();
        setMessage(t("auth.roleMismatch"));
        return;
      }
      navigate(role === "admin" ? "/admin/" : `/${role}`, { replace: true });
    } catch (error) {
      setMessage(t(`auth.errors.${errorCode(error)}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-8">
      <Link className="min-h-[44px] self-start text-primary underline" to="/">
        {t("auth.back")}
      </Link>
      <h1 className="text-3xl font-bold">{t(`auth.loginTitle.${role}`)}</h1>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => void submit(event)}
      >
        <label className="grid gap-2">
          <span>{t("auth.emailOrPhone")}</span>
          <input
            className="min-h-[48px] rounded-card border-2 border-primary bg-surface px-3"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span>{t("auth.password")}</span>
          <input
            className="min-h-[48px] rounded-card border-2 border-primary bg-surface px-3"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {message ? <p role="alert">{message}</p> : null}
        <button
          className="min-h-touch rounded-card bg-primary px-5 font-bold text-primaryText"
          disabled={busy}
          type="submit"
        >
          {busy ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>
    </main>
  );
}
