import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMeta, setMeta } from "../../../db/schema";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import { cancelSpeech, speak } from "../../../shared/hooks/useTts";
export function SectionHeader({ section }: { section: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDialogFocus(root, open, () => setOpen(false));
  const text = t(`walkthrough.${section}`);
  useEffect(() => {
    let active = true;
    void getMeta("walkthroughSeen")
      .then(async (value) => {
        const seen = JSON.parse(value ?? "{}") as Record<string, boolean>;
        if (!active || seen[section]) return;
        seen[section] = true;
        await setMeta("walkthroughSeen", JSON.stringify(seen));
        if (active) {
          setOpen(true);
          speak(text, { language: i18n.language });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      cancelSpeech();
    };
  }, [section, text, i18n.language]);
  return (
    <header className="mb-4">
      <button
        type="button"
        className="min-h-touch rounded-card border-2 border-primary p-4"
        onClick={() => {
          setOpen(true);
          speak(text, { language: i18n.language });
        }}
      >
        {t("walkthrough.replay")}
      </button>
      {open && (
        <div
          ref={root}
          role="dialog"
          aria-modal="true"
          aria-label={t("walkthrough.instructions")}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/95 p-4"
        >
          <div className="space-y-6 rounded-card bg-surface p-6">
            <p className="text-3xl leading-relaxed">{text}</p>
            <button
              autoFocus
              type="button"
              className="min-h-touch rounded-card bg-primary p-5 text-primary-text"
              onClick={() => {
                setOpen(false);
                cancelSpeech();
              }}
            >
              {t("walkthrough.gotIt")}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
