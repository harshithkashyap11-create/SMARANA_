import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import as from "./as.json";
import bn from "./bn.json";
import en from "./en.json";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    as: { translation: as },
    bn: { translation: bn },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  initImmediate: false,
});
