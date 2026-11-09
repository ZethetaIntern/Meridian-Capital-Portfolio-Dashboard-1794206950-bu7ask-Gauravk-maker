
import { beforeEach, describe, expect, it } from "vitest";
import {
  getAllWidgetConfigs,
  getWidgetConfig,
  saveWidgetConfig,
  deleteWidgetConfig,
  replaceAllWidgetConfigs,
} from "./widgetConfig";

describe("widget configuration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty configuration initially", () => {
    expect(getAllWidgetConfigs()).toEqual({});
  });

  it("saves widget configuration", () => {
    saveWidgetConfig("performance", {
      title: "My Performance",
      refreshInterval: 5000,
    });

    expect(getWidgetConfig("performance").title).toBe("My Performance");
  });

  it("returns default config for unknown widget", () => {
    expect(getWidgetConfig("unknown")).toEqual({});
  });

  it("rejects invalid refresh intervals", () => {
    expect(() =>
      saveWidgetConfig("performance", {
        refreshInterval: 500,
      }),
    ).toThrow();
  });

  it("rejects an empty widget ID", () => {
    expect(() =>
      saveWidgetConfig("", { title: "Test" }),
    ).toThrow();
  });

  it("preserves existing configuration when updating", () => {
    saveWidgetConfig("performance", {
      title: "Performance",
    });

    saveWidgetConfig("performance", {
      refreshInterval: 10000,
    });

    expect(getWidgetConfig("performance")).toEqual({
      title: "Performance",
      refreshInterval: 10000,
    });
  });

  it("deletes widget configuration", () => {
    saveWidgetConfig("performance", {
      title: "Performance",
    });

    deleteWidgetConfig("performance");

    expect(getWidgetConfig("performance")).toEqual({});
  });

  it("handles corrupted local storage", () => {
    localStorage.setItem("meridian-widget-config-v1", "{invalid");

    expect(getAllWidgetConfigs()).toEqual({});
  });
  
it("rejects titles longer than 60 characters", () => {
  expect(() =>
    saveWidgetConfig("performance", {
      title: "A".repeat(61),
    }),
  ).toThrow();
});

it("rejects invalid settings objects", () => {
  expect(() =>
    saveWidgetConfig("performance", {
      settings: "invalid" as unknown as Record<string, unknown>,
    }),
  ).toThrow();
});

it("ignores invalid configurations from local storage", () => {
  localStorage.setItem(
    "meridian-widget-config-v1",
    JSON.stringify({
      performance: {
        title: "Performance",
        refreshInterval: 500,
      },
      holdings: {
        title: "Holdings",
        refreshInterval: 5000,
      },
    }),
  );

  expect(getAllWidgetConfigs()).toEqual({
    holdings: {
      title: "Holdings",
      refreshInterval: 5000,
    },
  });
});

it("rejects refresh intervals above the maximum", () => {
  expect(() =>
    saveWidgetConfig("performance", {
      refreshInterval: 400000,
    }),
  ).toThrow();
});
it("replaces all widget configurations", () => {
  saveWidgetConfig("holdings", { title: "Old Title" });

  const result = replaceAllWidgetConfigs({
    performance: {
      title: "Performance Overview",
      refreshInterval: 10000,
    },
  });

  expect(result.performance.title).toBe("Performance Overview");
  expect(getWidgetConfig("holdings")).toEqual({});
});

it("clears all configurations when an empty object is imported", () => {
  saveWidgetConfig("holdings", { title: "My Holdings" });

  replaceAllWidgetConfigs({});

  expect(getAllWidgetConfigs()).toEqual({});
});

it("rejects invalid imported widget configurations", () => {
  expect(() =>
    replaceAllWidgetConfigs({
      holdings: { refreshInterval: 500 },
    }),
  ).toThrow("Invalid configuration for widget: holdings");
});
});
