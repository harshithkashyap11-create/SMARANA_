import { useEffect, type PropsWithChildren } from "react";

import { v1AuthMePreferencesPartialUpdate } from "../../api/generated/smarana";
import { useAuthStore } from "../../features/auth/authStore";
import { getMeta, setMeta } from "../../db/schema";
import { i18n, supportedLanguages, type SupportedLanguage } from ".";

function isSupportedLanguage(value: string | undefined): value is SupportedLanguage {
  return value !== undefined && supportedLanguages.includes(value as SupportedLanguage);
}

function applyLanguage(language: SupportedLanguage) {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
}

export function LanguageProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    let active = true;

    void getMeta("language")
      .then((savedLanguage) => {
        if (active && isSupportedLanguage(savedLanguage)) {
          void i18n.changeLanguage(savedLanguage);
        }
      })
      // IndexedDB is unavailable in server rendering and the unit-test DOM.
      .catch(() => undefined);

    const persistLanguage = (language: string) => {
      const selectedLanguage = language.split("-")[0];
      if (!isSupportedLanguage(selectedLanguage)) return;

      applyLanguage(selectedLanguage);
      void setMeta("language", selectedLanguage).catch(() => undefined);
      if (useAuthStore.getState().accessToken) {
        void v1AuthMePreferencesPartialUpdate({ language: selectedLanguage }).catch(
          () => undefined,
        );
      }
    };

    i18n.on("languageChanged", persistLanguage);
    applyLanguage(
      (i18n.resolvedLanguage ?? i18n.language).split("-")[0] as SupportedLanguage,
    );
    return () => {
      active = false;
      i18n.off("languageChanged", persistLanguage);
    };
  }, []);

  return children;
}
