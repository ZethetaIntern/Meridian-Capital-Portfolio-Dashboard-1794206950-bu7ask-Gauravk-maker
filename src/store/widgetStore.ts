
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WidgetSettings {
  title?: string;
  refreshInterval: number;
  enabled: boolean;
}

interface WidgetState {
  widgetSettings: Record<string, WidgetSettings>;

  updateWidgetSettings: (
    id: string,
    settings: Partial<WidgetSettings>,
  ) => void;

  toggleWidget: (id: string) => void;

  setRefreshInterval: (id: string, interval: number) => void;

  resetWidgetSettings: (id: string) => void;

  resetAllWidgetSettings: () => void;
}

const defaultWidgetSettings: WidgetSettings = {
  refreshInterval: 30000,
  enabled: true,
};

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set) => ({
      widgetSettings: {},

      updateWidgetSettings: (id, settings) =>
        set((state) => ({
          widgetSettings: {
            ...state.widgetSettings,
            [id]: {
              ...defaultWidgetSettings,
              ...state.widgetSettings[id],
              ...settings,
            },
          },
        })),

      toggleWidget: (id) =>
        set((state) => {
          const current =
            state.widgetSettings[id] ?? defaultWidgetSettings;

          return {
            widgetSettings: {
              ...state.widgetSettings,
              [id]: {
                ...current,
                enabled: !current.enabled,
              },
            },
          };
        }),

      setRefreshInterval: (id, interval) =>
        set((state) => ({
          widgetSettings: {
            ...state.widgetSettings,
            [id]: {
              ...(state.widgetSettings[id] ?? defaultWidgetSettings),
              refreshInterval: Math.max(1000, interval),
            },
          },
        })),

      resetWidgetSettings: (id) =>
        set((state) => {
          const updated = { ...state.widgetSettings };
          delete updated[id];

          return { widgetSettings: updated };
        }),

      resetAllWidgetSettings: () =>
        set({ widgetSettings: {} }),
    }),
    {
      name: "meridian-widget-settings",
    },
  ),
);
