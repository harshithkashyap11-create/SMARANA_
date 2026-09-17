import { PrivateImage } from "../../../shared/ui/PrivateImage";
import { createPortal } from "react-dom";
import { speak } from "../../../shared/hooks/useTts";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { patientRepository } from "../../../db/repo/patient";
import { useCalmStore } from "./store";
export function ConfusedMode() {
  const overlay = useRef<HTMLElement>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { calmMode, setCalmMode } = useCalmStore();
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    void patientRepository
      .getFamilyMembers()
      .then((members) =>
        setPhoto(members.find((m) => m.photoUrl)?.photoUrl ?? null),
      )
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!calmMode) return;
    const previousFocus = document.activeElement;
    overlay.current?.querySelector<HTMLButtonElement>("button")?.focus();
    speak(t("confused.comfort"));
    const audio = Array.from(
      document.querySelectorAll<HTMLMediaElement>("audio, video"),
    );
    const volumes = audio.map((a) => a.volume);
    audio.forEach((a) => {
      a.volume = Math.min(a.volume, 0.15);
    });
    return () => {
      audio.forEach((a, i) => {
        a.volume = volumes[i] ?? 1;
      });
      window.speechSynthesis?.cancel();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [calmMode, t]);
  useEffect(() => () => useCalmStore.getState().setCalmMode(false), []);
  const go = (path: string) => {
    setCalmMode(false);
    void navigate(path);
  };
  return (
    <>
      <button
        aria-label={t("confused.button")}
        className="patient-break-button fixed bottom-24 left-4 z-20 rounded-card bg-calm p-3"
        onClick={() => setCalmMode(true)}
      >
        {t("confused.shortButton")}
      </button>
      {calmMode &&
        createPortal(
          <section
            ref={overlay}
            onKeyDown={(e) => {
              if (e.key === "Escape") setCalmMode(false);
              if (e.key === "Tab") {
                const buttons = overlay.current?.querySelectorAll("button");
                const first = buttons?.[0];
                const last = buttons?.[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-label={t("confused.button")}
            className="fixed inset-0 z-30 flex flex-col items-center justify-start gap-3 overflow-y-auto bg-calm p-4 text-text"
          >
            <h1 className="text-3xl">{t("confused.comfort")}</h1>
            {photo && (
              <PrivateImage
                className="h-32 w-32 shrink-0 rounded-card object-cover sm:h-48 sm:w-48"
                alt={t("confused.photo")}
                src={photo}
              />
            )}
            <button
              className="min-h-touch shrink-0 p-4"
              onClick={() => go("/patient/routine")}
            >
              {t("confused.routine")}
            </button>
            <button
              className="min-h-touch shrink-0 p-4"
              onClick={() => go("/patient/calm")}
            >
              {t("confused.calm")}
            </button>
            <button
              className="min-h-touch shrink-0 p-4"
              onClick={() => {
                setCalmMode(false);
                window.dispatchEvent(new Event("smarana:open-sos-confirm"));
              }}
            >
              {t("confused.call")}
            </button>
            <button
              className="min-h-touch shrink-0 p-4"
              onClick={() => setCalmMode(false)}
            >
              {t("confused.resume")}
            </button>
          </section>,
          document.body,
        )}
    </>
  );
}
