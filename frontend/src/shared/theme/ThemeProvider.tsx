import { useEffect, type PropsWithChildren } from "react";

import { useThemeStore } from "./store";
import { getMeta } from "../../db/schema";

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useThemeStore((state) => state.theme);
  const fontScale = useThemeStore((state) => state.fontScale);

  useEffect(() => {
    const load = () => {
      void Promise.all([getMeta("theme"), getMeta("fontScale")])
        .then(([savedTheme, savedScale]) => {
          useThemeStore
            .getState()
            .setTheme(savedTheme === "dark" ? "dark" : "light");
          const scale = Number(savedScale);
          useThemeStore
            .getState()
            .setFontScale(
              [1, 1.2, 1.4, 1.6].includes(scale)
                ? (scale as 1 | 1.2 | 1.4 | 1.6)
                : 1,
            );
        })
        .catch(() => undefined);
    };
    load();
    window.addEventListener("smarana:session-ready", load);
    window.addEventListener("smarana:comfort-updated", load);
    return () => {
      window.removeEventListener("smarana:session-ready", load);
      window.removeEventListener("smarana:comfort-updated", load);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.fontScale = String(fontScale);
    document.documentElement.style.setProperty("--scale", String(fontScale));
  }, [fontScale, theme]);

  return children;
}
