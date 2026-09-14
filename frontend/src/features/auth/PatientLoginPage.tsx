import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { getMeta, setMeta } from "../../db/schema";
import { Keypad } from "../../shared/ui";
import { useAuthStore } from "./authStore";

const LOGIN_ID_KEY = "patient_login_id";
const DEVICE_ID_KEY = "patient_device_id";

function deviceId(): string {
  const remembered = window.localStorage.getItem(DEVICE_ID_KEY);
  if (remembered) return remembered;
  const created = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

function errorCode(error: unknown): string {
  if (
    !(error instanceof ApiError) ||
    typeof error.body !== "object" ||
    !error.body
  ) {
    return "request_not_completed";
  }
  const code = (error.body as { code?: unknown }).code;
  return typeof code === "string" ? code : "request_not_completed";
}

export function PatientLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const patientLogin = useAuthStore((state) => state.patientLogin);
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getMeta(LOGIN_ID_KEY).then((value) => setLoginId(value ?? ""));
  }, []);

  const submit = async (nextPin: string): Promise<void> => {
    if (!loginId.trim() || submitting) return;
    setSubmitting(true);
    setMessageKey(null);
    try {
      await patientLogin({
        login_id: loginId.trim(),
        pin: nextPin,
        device_id: deviceId(),
      });
      await setMeta(LOGIN_ID_KEY, loginId.trim());
      navigate("/patient", { replace: true });
    } catch (error) {
      const code = errorCode(error);
      setMessageKey(
        code === "locked"
          ? "auth.locked_caregiver_told"
          : code === "pin_not_verified"
            ? "auth.pin_no_match"
            : "auth.errors.request_not_completed",
      );
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  const addDigit = (digit: string): void => {
    if (pin.length >= 4) return;
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    if (nextPin.length === 4) void submit(nextPin);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 p-4">
      <button
        className="min-h-touch self-start px-3 font-bold"
        type="button"
        onClick={() => navigate("/")}
      >
        ← {t("auth.back")}
      </button>
      <header className="text-center">
        <h1 className="text-3xl font-bold">{t("auth.patientPinTitle")}</h1>
        <p className="text-muted">{t("auth.patientPinHelp")}</p>
      </header>
      <label className="space-y-2 font-bold">
        <span>{t("auth.loginId")}</span>
        <input
          autoCapitalize="characters"
          className="min-h-touch w-full rounded-card border-2 border-primary bg-surface px-4 text-text"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
        />
      </label>
      <div
        aria-label={t("auth.pinEntered", { count: pin.length })}
        className="flex justify-center gap-4 text-4xl"
        role="status"
      >
        {[0, 1, 2, 3].map((index) => (
          <span aria-hidden="true" key={index}>
            {index < pin.length ? "●" : "○"}
          </span>
        ))}
      </div>
      {messageKey ? (
        <p
          className="rounded-card bg-calm p-4 text-center font-bold"
          role="alert"
        >
          {t(messageKey)}
        </p>
      ) : null}
      <Keypad
        backspaceLabel={t("auth.backspace")}
        disabled={submitting}
        label={t("auth.pinKeypad")}
        onBackspace={() => setPin((value) => value.slice(0, -1))}
        onDigit={addDigit}
      />
    </main>
  );
}
