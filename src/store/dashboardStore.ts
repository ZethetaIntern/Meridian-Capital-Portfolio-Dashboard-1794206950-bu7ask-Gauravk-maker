
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeName = "dark" | "light" | "contrast";

const DEFAULT_WIDGETS = [
  "allocation",
  "performance",
  "heatmap",
  "holdings",
  "news",
  "alerts",
  "var",
  "correlation",
  "attribution",
  "ticker",
  "drawdown",
  "treemap",
];

interface DashboardState {
  theme: ThemeName;
  activeWidgets: string[];
  paused: boolean;

  setTheme: (theme: ThemeName) => void;
  addWidget: (id: string) => void;
  removeWidget: (id: string) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      theme: "dark",
      activeWidgets: [...DEFAULT_WIDGETS],
      paused: false,

      setTheme: (theme) => {
        set({ theme });
      },

      addWidget: (id) => {
        const widgetId = id.trim();

        if (!widgetId) return;

        set((state) => ({
          activeWidgets: state.activeWidgets.includes(widgetId)
            ? state.activeWidgets
            : [...state.activeWidgets, widgetId],
        }));
      },

      removeWidget: (id) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.filter(
            (widgetId) => widgetId !== id,
          ),
        }));
      },

      togglePause: () => {
        set((state) => ({
          paused: !state.paused,
        }));
      },

      setPaused: (paused) => {
        set({ paused });
      },

      reset: () => {
        set({
          theme: "dark",
          activeWidgets: [...DEFAULT_WIDGETS],
          paused: false,
        });
      },
    }),
    {
      name: "meridian-dashboard-preferences",
    },
  ),
);
