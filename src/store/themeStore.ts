
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeName } from "./dashboardStore";

interface ThemeState {
  theme: ThemeName;
  accentColor: string;
  customColors: Record<string, string>;

  setTheme: (theme: ThemeName) => void;
  setAccentColor: (color: string) => void;
  setCustomColor: (key: string, color: string) => void;
  resetTheme: () => void;
}

const DEFAULT_ACCENT = "#6d8cff";

const isValidColor = (color: string): boolean => {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      accentColor: DEFAULT_ACCENT,
      customColors: {},

      setTheme: (theme) => set({ theme }),

      setAccentColor: (color) => {
        if (isValidColor(color)) {
          set({ accentColor: color });
        }
      },

      setCustomColor: (key, color) => {
        if (!key.trim() || !isValidColor(color)) return;

        set((state) => ({
          customColors: {
            ...state.customColors,
            [key]: color,
          },
        }));
      },

      resetTheme: () =>
        set({
          theme: "dark",
          accentColor: DEFAULT_ACCENT,
          customColors: {},
        }),
    }),
    {
      name: "meridian-theme-settings",
    },
  ),
);
