import { beforeEach, describe, expect, it } from "vitest";
import { useLayoutStore } from "./layoutStore";
import type { SavedLayout } from "../layout/serializer";

const createLayout = (name: string): SavedLayout =>
  ({
    name,
    layouts: {},
  }) as unknown as SavedLayout;

describe("layoutStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useLayoutStore.getState().resetLayouts();
  });

  it("starts with empty layouts and no active layout", () => {
    const state = useLayoutStore.getState();

    expect(state.savedLayouts).toEqual([]);
    expect(state.activeLayoutName).toBeNull();
  });

  it("saves a layout and makes it active", () => {
    const layout = createLayout("My Dashboard");

    useLayoutStore.getState().saveLayout(layout);

    expect(useLayoutStore.getState().savedLayouts).toEqual([layout]);
    expect(useLayoutStore.getState().activeLayoutName).toBe(
      "My Dashboard",
    );
  });

  it("saves multiple layouts", () => {
    const store = useLayoutStore.getState();

    store.saveLayout(createLayout("Layout One"));
    useLayoutStore.getState().saveLayout(createLayout("Layout Two"));

    expect(useLayoutStore.getState().savedLayouts).toHaveLength(2);
  });

  it("replaces an existing layout with the same name", () => {
    const store = useLayoutStore.getState();

    store.saveLayout(createLayout("Main"));

    const updatedLayout = createLayout("Main");
    useLayoutStore.getState().saveLayout(updatedLayout);

    expect(useLayoutStore.getState().savedLayouts).toHaveLength(1);
    expect(useLayoutStore.getState().savedLayouts[0]).toBe(
      updatedLayout,
    );
  });

  it("loads an existing layout by name", () => {
    const layout = createLayout("Analytics");

    useLayoutStore.getState().saveLayout(layout);

    expect(
      useLayoutStore.getState().loadLayout("Analytics"),
    ).toBe(layout);
  });

  it("returns undefined for a missing layout", () => {
    expect(
      useLayoutStore.getState().loadLayout("Missing"),
    ).toBeUndefined();
  });

  it("deletes a layout", () => {
    const store = useLayoutStore.getState();

    store.saveLayout(createLayout("Main"));
    useLayoutStore.getState().deleteLayout("Main");

    expect(useLayoutStore.getState().savedLayouts).toEqual([]);
  });

  it("clears active layout when the active layout is deleted", () => {
    useLayoutStore.getState().saveLayout(createLayout("Main"));

    useLayoutStore.getState().deleteLayout("Main");

    expect(useLayoutStore.getState().activeLayoutName).toBeNull();
  });

  it("preserves active layout when another layout is deleted", () => {
    const store = useLayoutStore.getState();

    store.saveLayout(createLayout("Main"));
    useLayoutStore.getState().saveLayout(createLayout("Secondary"));

    useLayoutStore.getState().deleteLayout("Main");

    expect(useLayoutStore.getState().activeLayoutName).toBe(
      "Secondary",
    );
  });

  it("sets active layout name", () => {
    useLayoutStore.getState().setActiveLayout("Custom");

    expect(useLayoutStore.getState().activeLayoutName).toBe("Custom");
  });

  it("allows clearing active layout name", () => {
    useLayoutStore.getState().setActiveLayout("Custom");

    useLayoutStore.getState().setActiveLayout(null);

    expect(useLayoutStore.getState().activeLayoutName).toBeNull();
  });

  it("resets all saved layouts", () => {
    const store = useLayoutStore.getState();

    store.saveLayout(createLayout("One"));
    useLayoutStore.getState().saveLayout(createLayout("Two"));

    useLayoutStore.getState().resetLayouts();

    expect(useLayoutStore.getState().savedLayouts).toEqual([]);
    expect(useLayoutStore.getState().activeLayoutName).toBeNull();
  });
});