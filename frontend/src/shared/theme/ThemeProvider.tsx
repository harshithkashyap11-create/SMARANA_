import { useEffect, type PropsWithChildren } from "react";

import { useThemeStore } from "./store";
import { getMeta } from "../../db/schema";

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useThemeStore((state) => state.theme);
  const fontScale = useThemeStore((state) => state.fontScale);

  useEffect(() => {
    void Promise.all([getMeta("theme"), getMeta("fontScale")]).then(([savedTheme, savedScale]) => {
      if (savedTheme === "light" || savedTheme === "dark") useThemeStore.getState().setTheme(savedTheme);
      const scale = Number(savedScale);
      if ([1, 1.2, 1.4, 1.6].includes(scale)) useThemeStore.getState().setFontScale(scale as 1 | 1.2 | 1.4 | 1.6);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.fontScale = String(fontScale);
    document.documentElement.style.setProperty("--scale", String(fontScale));
  }, [fontScale, theme]);

  return children;
}
