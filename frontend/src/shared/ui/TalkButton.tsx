import { saveComfortSettings } from "../../db/accessibility";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { patientRepository } from "../../db/repo/patient";
import { routineRepository } from "../../db/repo/routine";
import { activeProfile, getMeta } from "../../db/schema";
import { performAction } from "../../voice/actions";
import { routeWithFallback } from "../../voice/fallback";
import { isLanguageSwitchRequest, route } from "../../voice/router";
import { BrowserSpeechToText, type VoiceLanguage } from "../../voice/stt";
import { BrowserTextToSpeech } from "../../voice/tts";
import { ConfirmDialog } from "./ConfirmDialog";

export function TalkButton({
  onRecognised,
}: {
  onRecognised?: (text: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [request, setRequest] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    action: () => void;
  } | null>(null);
  const language = (i18n.resolvedLanguage?.split("-")[0] ??
    "en") as VoiceLanguage;
  const playback = useRef<BrowserTextToSpeech>();
  const speech = useMemo(() => new BrowserSpeechToText(language), [language]);

  useEffect(() => () => { speech.stop(); playback.current?.cancel(); }, [speech]);

  const handle = async (value: string): Promise<void> => {
    setText(value);
    onRecognised?.(value);
    if (onRecognised) return;
    const profile = await activeProfile();
    if (!profile) return;
    const members = await patientRepository.getFamilyMembers();
    playback.current?.cancel();
    const tts = new BrowserTextToSpeech(
      language,
      (await getMeta("slowSpeech")) === "1",
    );
    playback.current = tts;
    const languageLocked = (await getMeta("languageLocked")) === "1";
    const lockedLanguageRequest =
      languageLocked && isLanguageSwitchRequest(value);
    const command =
      route(value, language, { familyMembers: members, languageLocked }) ??
      (lockedLanguageRequest ? null : await routeWithFallback(value, language));
    if (!command) {
      setError(t(lockedLanguageRequest ? "voice.languageLocked" : "voice.unknown"));
      if (lockedLanguageRequest) {
        await tts.speak(t("voice.languageLocked"));
      }
      return;
    }
    await performAction(command, {
      navigate,
      tts,
      routine: routineRepository,
      patientId: profile.id,
      mainText: document.querySelector("main")?.textContent ?? "",
      confirm: (message, action) => setConfirmation({ message, action }),
      nextActivity: async () => {
        const orientation = await patientRepository.getOrientation();
        return orientation.next_activity
          ? t("voice.activityNext", { title: orientation.next_activity.title })
          : `${orientation.day}, ${orientation.date}.`;
      },
      callPerson: (name) => {
        const member = members.find((item) => item.name === name);
        if (member?.phone) window.location.href = `tel:${member.phone}`;
      },
      openSos: () =>
        window.dispatchEvent(new Event("smarana:open-sos-confirm")),
      setSlowSpeech: async (slow) => saveComfortSettings({ slow_speech: slow }),
    });
  };
  const toggle = (): void => {
    if (listening) {
      speech.stop();
      setListening(false);
      return;
    }
    setOpen(true);
    setText("");
    setError("");
    window.speechSynthesis?.cancel();
    setListening(true);
    speech.start(
      (value) => {
        setListening(false);
        speech.stop();
        void handle(value).catch(() => setError(t("voice.recognitionFailed")));
      },
      () => setListening(false),
      (code) => setError(t(code === "unsupported" ? "voice.unsupported" : code === "not-allowed" || code === "service-not-allowed" ? "voice.permissionDenied" : "voice.recognitionFailed")),
    );
  };
  return (
    <>
      <button
        aria-pressed={listening}
        className={`min-h-touch justify-self-end rounded-card px-2 font-bold ${listening ? "animate-pulse bg-primary text-white" : ""}`}
        type="button"
        onClick={toggle}
      >
        ◖)) {t("patient.talk")}
      </button>
      {open ? (
        <div
          className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-lg rounded-card bg-surface p-5 shadow-card"
          role="status"
        >
          <strong>{listening ? t("voice.listening") : t("voice.heard")}</strong>
          {text ? <p>{text}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => {
            event.preventDefault();
            if (!request.trim()) return;
            speech.stop();
            setListening(false);
            setError("");
            void handle(request.trim()).catch(() => setError(t("voice.recognitionFailed")));
            setRequest("");
          }}>
            <input aria-label={t("voice.request")} className="min-h-touch min-w-0 flex-1 rounded-card border p-2" value={request} onChange={(event) => setRequest(event.target.value)} />
            <button className="min-h-touch rounded-card bg-primary px-4 text-primaryText" type="submit">{t("voice.send")}</button>
          </form>
          <button className="mt-2 min-h-touch underline" type="button" onClick={() => { speech.stop(); setListening(false); setOpen(false); }}>{t("auth.back")}</button>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.message ?? ""}
        yesLabel={t("common.yes")}
        noLabel={t("common.no")}
        ttsLabel={t("patient.listen")}
        onYes={() => {
          confirmation?.action();
          setConfirmation(null);
        }}
        onNo={() => setConfirmation(null)}
      />
    </>
  );
}
