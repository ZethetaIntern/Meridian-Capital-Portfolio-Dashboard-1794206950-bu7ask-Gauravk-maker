
import { beforeEach, describe, expect, it } from "vitest";

import {
  getLayoutHistory,
  saveLayoutSnapshot,
  deleteLayoutSnapshot,
} from "./layoutHistory";

import type { Layout } from "react-grid-layout";

const sampleLayout: Layout[] = [
  {
    i: "performance",
    x: 0,
    y: 0,
    w: 6,
    h: 4,
  },
];

describe("Dashboard Layout History", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty history initially", () => {
    expect(getLayoutHistory()).toEqual([]);
  });

  it("saves a layout snapshot", () => {
    const history = saveLayoutSnapshot(
      "My Dashboard",
      sampleLayout,
    );

    expect(history).toHaveLength(1);
    expect(history[0].name).toBe("My Dashboard");
  });

  it("restores saved snapshots from storage", () => {
    saveLayoutSnapshot("Workspace", sampleLayout);

    expect(getLayoutHistory()).toHaveLength(1);
  });

  it("rejects an empty layout name", () => {
    expect(() =>
      saveLayoutSnapshot("   ", sampleLayout),
    ).toThrow("Layout name is required.");
  });

  it("keeps only the latest 10 snapshots", () => {
    for (let i = 1; i <= 12; i++) {
      saveLayoutSnapshot(`Layout ${i}`, sampleLayout);
    }

    expect(getLayoutHistory()).toHaveLength(10);
    expect(getLayoutHistory()[0].name).toBe("Layout 12");
  });

  it("deletes a saved snapshot", () => {
    const history = saveLayoutSnapshot(
      "Temporary",
      sampleLayout,
    );

    deleteLayoutSnapshot(history[0].id);

    expect(getLayoutHistory()).toHaveLength(0);
  });

  it("handles corrupted storage safely", () => {
    localStorage.setItem(
      "meridian-layout-history-v1",
      "{invalid json",
    );

    expect(getLayoutHistory()).toEqual([]);
  });
});
