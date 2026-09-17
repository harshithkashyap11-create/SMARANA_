import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import { useTranslation } from "react-i18next";

export function RegisterPage() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await apiClient("/api/v1/auth/register/", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
      });
      setMessage(
        t(
          data.get("role") === "patient"
            ? "registration.created"
            : "registration.pending",
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? JSON.stringify(error.body)
          : t("auth.errors.request_not_completed"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto grid max-w-md gap-5 p-6">
      <Link to="/">{t("auth.back")}</Link>
      <h1 className="text-3xl font-bold">{t("registration.create")}</h1>
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <label>
          {t("registration.type")}
          <select name="role" className="min-h-touch w-full border p-2">
            <option value="patient">{t("registration.user")}</option>
            <option value="caregiver">{t("registration.caregiver")}</option>
            <option value="doctor">{t("registration.doctor")}</option>
          </select>
        </label>
        <label>
          {t("registration.name")}
          <input
            className="min-h-touch w-full border p-2"
            name="display_name"
            required
            autoComplete="name"
          />
        </label>
        <label>
          {t("registration.email")}
          <input
            className="min-h-touch w-full border p-2"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </label>
        <label>
          {t("auth.password")}
          <input
            className="min-h-touch w-full border p-2"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <button
          className="min-h-touch rounded-card bg-primary p-3 text-primaryText"
          disabled={busy}
        >
          {t("registration.create")}
        </button>
      </form>
      <p role="status">{message}</p>
      <Link to="/login/user">{t("registration.passwordLogin")}</Link>
      <Link to="/login/caregiver">{t("auth.loginTitle.caregiver")}</Link>
      <Link to="/login/doctor">{t("auth.loginTitle.doctor")}</Link>
    </main>
  );
}
