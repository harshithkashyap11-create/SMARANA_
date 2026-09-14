import { useEffect, type PropsWithChildren } from "react";

import { useThemeStore } from "./store";

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useThemeStore((state) => state.theme);
  const fontScale = useThemeStore((state) => state.fontScale);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.fontScale = String(fontScale);
    document.documentElement.style.setProperty("--scale", String(fontScale));
  }, [fontScale, theme]);

  return children;
}
