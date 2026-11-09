
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedLayout } from "../layout/serializer";

interface LayoutState {
  savedLayouts: SavedLayout[];
  activeLayoutName: string | null;

  saveLayout: (layout: SavedLayout) => void;
  loadLayout: (name: string) => SavedLayout | undefined;
  deleteLayout: (name: string) => void;
  setActiveLayout: (name: string | null) => void;
  resetLayouts: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      savedLayouts: [],
      activeLayoutName: null,

      saveLayout: (layout) =>
        set((state) => {
          const existing = state.savedLayouts.filter(
            (item) => item.name !== layout.name,
          );

          return {
            savedLayouts: [...existing, layout],
            activeLayoutName: layout.name,
          };
        }),

      loadLayout: (name) =>
        get().savedLayouts.find((layout) => layout.name === name),

      deleteLayout: (name) =>
        set((state) => ({
          savedLayouts: state.savedLayouts.filter(
            (layout) => layout.name !== name,
          ),
          activeLayoutName:
            state.activeLayoutName === name
              ? null
              : state.activeLayoutName,
        })),

      setActiveLayout: (name) =>
        set({ activeLayoutName: name }),

      resetLayouts: () =>
        set({
          savedLayouts: [],
          activeLayoutName: null,
        }),
    }),
    {
      name: "meridian-saved-layouts",
    },
  ),
);
