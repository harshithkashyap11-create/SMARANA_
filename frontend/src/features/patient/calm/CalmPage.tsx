import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BigButton } from "../../../shared/ui";
import { speak } from "../../../shared/hooks/useTts";
const cues = ["in", "hold", "out"] as const;
const durations = [4000, 4000, 6000];
export function CalmPage() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(-1);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const complete = step >= 15;
  const running = step >= 0 && !complete;
  const cue = running ? cues[step % 3]! : complete ? "complete" : "ready";
  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference?.matches ?? false);
    preference?.addEventListener("change", update);
    return () => preference?.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!running) return;
    speak(t(`calm.${cues[step % 3]}`), {rate: .7, language: i18n.resolvedLanguage});
    const timer = window.setTimeout(() => setStep((value) => value + 1), durations[step % 3]);
    return () => { window.clearTimeout(timer); window.speechSynthesis?.cancel(); };
  }, [step, running, t, i18n.resolvedLanguage]);
  return <section className="space-y-6 text-center">
    <h1 className="text-3xl font-bold">{t("calm.title")}</h1>
    <p className="text-xl">{t("calm.help")}</p>
    <div aria-hidden="true" className="mx-auto my-12 h-40 w-40 rounded-full bg-primary/30" style={reducedMotion ? undefined : {transform: running && cue !== "out" ? "scale(1.35)" : "scale(1)", transition: `transform ${running ? durations[step % 3] : 1000}ms ease-in-out`}} />
    <p className="text-2xl font-bold" role="status">{t(`calm.${cue}`)}</p>
    {running ? <BigButton onClick={() => setStep(-1)}>{t("calm.stop")}</BigButton> : <BigButton onClick={() => setStep(0)}>{t(complete ? "games.playAgain" : "calm.start")}</BigButton>}
  </section>;
}
