import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BrowserSpeechToText, type VoiceLanguage } from "../../voice/stt";
export function TalkButton({ onRecognised }: { onRecognised?: (text: string) => void }) {
  const { t, i18n } = useTranslation(); const [listening, setListening] = useState(false); const [text, setText] = useState("");
  const speech = useMemo(() => new BrowserSpeechToText((i18n.resolvedLanguage?.split("-")[0] ?? "en") as VoiceLanguage), [i18n.resolvedLanguage]);
  const toggle = () => { if (listening) { speech.stop(); setListening(false); return; } setListening(true); speech.start((value) => { setText(value); onRecognised?.(value); }, () => setListening(false)); };
  return <><button aria-pressed={listening} className={`min-h-touch justify-self-end rounded-card px-2 font-bold ${listening ? "animate-pulse bg-primary text-white" : ""}`} type="button" onClick={toggle}>◖)) {t("patient.talk")}</button>{listening || text ? <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-lg rounded-card bg-surface p-5 shadow-card" role="status"><strong>{listening ? "Listening…" : "I heard"}</strong>{text ? <p>{text}</p> : null}</div> : null}</>;
}
