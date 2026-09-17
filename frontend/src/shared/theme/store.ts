import { create } from "zustand";

export type Theme = "light" | "dark";
export type FontScale = 1 | 1.2 | 1.4 | 1.6;

const fontScales: readonly FontScale[] = [1, 1.2, 1.4, 1.6];

interface ThemeState {
  theme: Theme;
  fontScale: FontScale;
  toggleTheme: () => void;
  cycleFontScale: () => void;
  setTheme: (theme: Theme) => void;
  setFontScale: (fontScale: FontScale) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  fontScale: 1,
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  cycleFontScale: () =>
    set((state) => {
      const currentIndex = fontScales.indexOf(state.fontScale);
      const nextIndex = (currentIndex + 1) % fontScales.length;
      return { fontScale: fontScales[nextIndex] ?? 1 };
    }),
  setTheme: (theme) => set({ theme }),
  setFontScale: (fontScale) => set({ fontScale }),
}));
