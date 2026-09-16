import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { patientRepository } from "../../db/repo/patient";
import { routineRepository } from "../../db/repo/routine";
import { db, getMeta, setMeta } from "../../db/schema";
import { performAction } from "../../voice/actions";
import { routeWithFallback } from "../../voice/fallback";
import { isLanguageSwitchRequest, route } from "../../voice/router";
import { BrowserSpeechToText, type VoiceLanguage } from "../../voice/stt";
import { BrowserTextToSpeech } from "../../voice/tts";
import { ConfirmDialog } from "./ConfirmDialog";

export function TalkButton({ onRecognised }: { onRecognised?: (text: string) => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [confirmation, setConfirmation] = useState<{ message: string; action: () => void } | null>(null);
  const language = (i18n.resolvedLanguage?.split("-")[0] ?? "en") as VoiceLanguage;
  const speech = useMemo(() => new BrowserSpeechToText(language), [language]);

  const handle = async (value: string): Promise<void> => {
    setText(value);
    onRecognised?.(value);
    if (onRecognised) return;
    const profile = await db.profile.orderBy("refreshedAt").last();
    if (!profile) return;
    const members = await patientRepository.getFamilyMembers();
    const tts = new BrowserTextToSpeech(language, (await getMeta("slowSpeech")) === "1");
    const languageLocked = (await getMeta("languageLocked")) === "1";
    const lockedLanguageRequest = languageLocked && isLanguageSwitchRequest(value);
    const command = route(value, language, { familyMembers: members, languageLocked }) ?? (lockedLanguageRequest ? null : await routeWithFallback(value, language));
    if (!command) {
      if (lockedLanguageRequest) {
        await tts.speak("Language is locked. Ask Priya to change it.");
      }
      return;
    }
    await performAction(command, {
      navigate, tts, routine: routineRepository, patientId: profile.id,
      mainText: document.querySelector("main")?.textContent ?? "",
      confirm: (message, action) => setConfirmation({ message, action }),
      nextActivity: async () => { const orientation = await patientRepository.getOrientation(); return orientation.next_activity ? `${orientation.next_activity.title} is next.` : `${orientation.day}, ${orientation.date}.`; },
      callPerson: (name) => { const member = members.find((item) => item.name === name); if (member?.phone) window.location.href = `tel:${member.phone}`; },
      openSos: () => window.dispatchEvent(new Event("smarana:open-sos-confirm")),
      setSlowSpeech: async (slow) => setMeta("slowSpeech", slow ? "1" : "0"),
    });
  };
  const toggle = (): void => {
    if (listening) { speech.stop(); setListening(false); return; }
    setListening(true);
    speech.start((value) => void handle(value), () => setListening(false));
  };
  return <><button aria-pressed={listening} className={`min-h-touch justify-self-end rounded-card px-2 font-bold ${listening ? "animate-pulse bg-primary text-white" : ""}`} type="button" onClick={toggle}>◖)) {t("patient.talk")}</button>{listening || text ? <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-lg rounded-card bg-surface p-5 shadow-card" role="status"><strong>{listening ? "Listening…" : "I heard"}</strong>{text ? <p>{text}</p> : null}</div> : null}<ConfirmDialog open={Boolean(confirmation)} title={confirmation?.message ?? ""} yesLabel="Yes" noLabel="No" ttsLabel={t("patient.listen")} onYes={() => { confirmation?.action(); setConfirmation(null); }} onNo={() => setConfirmation(null)} /></>;
}
