
import { beforeEach, describe, expect, it } from "vitest";
import {
  deserializeLayout,
  serializeLayout,
  saveLayout,
  loadLayout,
  MAX_LAYOUT_BYTES,
} from "./serializer";

const validLayout = {
  version: "1.0.0",
  name: "Test Dashboard",
  theme: "dark" as const,
  widgets: [
    { i: "performance", x: 0, y: 0, w: 6, h: 4 },
    { i: "holdings", x: 6, y: 0, w: 6, h: 4 },
  ],
};

describe("Dashboard Serializer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("serializes a valid layout", () => {
    const result = serializeLayout(validLayout);
    expect(JSON.parse(result)).toEqual(validLayout);
  });

  it("deserializes a valid layout", () => {
    const result = deserializeLayout(JSON.stringify(validLayout));
    expect(result).toEqual(validLayout);
  });

  it("rejects invalid JSON", () => {
    expect(() => deserializeLayout("{invalid")).toThrow(
      "Invalid JSON file."
    );
  });

  it("rejects unsupported versions", () => {
    const invalid = {
      ...validLayout,
      version: "99.0.0",
    };

    expect(() => deserializeLayout(JSON.stringify(invalid))).toThrow();
  });

  it("rejects duplicate widget IDs", () => {
    const invalid = {
      ...validLayout,
      widgets: [
        ...validLayout.widgets,
        { i: "performance", x: 0, y: 5, w: 4, h: 3 },
      ],
    };

    expect(() => deserializeLayout(JSON.stringify(invalid))).toThrow();
  });

  it("rejects layouts exceeding 50KB", () => {
    const oversized = JSON.stringify({
      ...validLayout,
      name: "A".repeat(MAX_LAYOUT_BYTES + 100),
    });

    expect(() => deserializeLayout(oversized)).toThrow(
      "Layout file exceeds the 50KB size limit."
    );
  });

  it("rejects widgets outside dashboard width", () => {
    const invalid = {
      ...validLayout,
      widgets: [
        { i: "performance", x: 10, y: 0, w: 6, h: 4 },
      ],
    };

    expect(() => deserializeLayout(JSON.stringify(invalid))).toThrow();
  });

  it("saves a layout to localStorage", () => {
    saveLayout(validLayout);

    expect(localStorage.getItem("meridian-layout")).not.toBeNull();
  });

  it("loads a saved layout from localStorage", () => {
    saveLayout(validLayout);

    expect(loadLayout()).toEqual(validLayout);
  });

  it("returns null when no saved layout exists", () => {
    expect(loadLayout()).toBeNull();
  });
  
it("accepts valid widget configurations", () => {
  const layout = {
    version: "1.0.0",
    name: "My Dashboard",
    theme: "dark" as const,
    widgets: [
      { i: "performance", x: 0, y: 0, w: 6, h: 4 },
    ],
    widgetConfigs: {
      performance: {
        title: "My Performance",
        refreshInterval: 5000,
      },
    },
  };

  expect(() => serializeLayout(layout)).not.toThrow();
});

it("rejects invalid widget refresh intervals", () => {
  const layout = {
    version: "1.0.0",
    name: "My Dashboard",
    theme: "dark" as const,
    widgets: [
      { i: "performance", x: 0, y: 0, w: 6, h: 4 },
    ],
    widgetConfigs: {
      performance: {
        refreshInterval: 500,
      },
    },
  };

  expect(() => serializeLayout(layout)).toThrow();
});

it("supports old layout files without widget configurations", () => {
  const layout = {
    version: "1.0.0",
    name: "Old Dashboard",
    theme: "dark" as const,
    widgets: [
      { i: "performance", x: 0, y: 0, w: 6, h: 4 },
    ],
  };

  expect(() => serializeLayout(layout)).not.toThrow();
});
});
