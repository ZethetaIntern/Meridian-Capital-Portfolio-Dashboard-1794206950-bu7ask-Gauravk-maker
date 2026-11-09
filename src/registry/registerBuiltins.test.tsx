
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearRegistry,
  getAllWidgets,
  getWidget,
  getWidgetsByCategory,
} from "./widgetRegistry";

import { registerBuiltInWidgets } from "./registerBuiltins";

describe("Built-in Widget Registration", () => {
  beforeEach(() => {
    clearRegistry();
    registerBuiltInWidgets();
  });

  it("registers all 12 built-in widgets", () => {
    expect(getAllWidgets()).toHaveLength(12);
  });

  it("registers all expected widget IDs", () => {
    const expectedIds = [
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

    const registeredIds = getAllWidgets().map((widget) => widget.id);

    expectedIds.forEach((id) => {
      expect(registeredIds).toContain(id);
    });
  });

  it("registers the Performance widget", () => {
    expect(getWidget("performance")).toBeDefined();
  });

  it("registers the Holdings widget", () => {
    expect(getWidget("holdings")).toBeDefined();
  });

  it("registers the Alerts widget", () => {
    expect(getWidget("alerts")).toBeDefined();
  });

  it("registers widgets with valid dimensions", () => {
    getAllWidgets().forEach((widget) => {
      expect(widget.defaultSize.w).toBeGreaterThan(0);
      expect(widget.defaultSize.h).toBeGreaterThan(0);
      expect(widget.minSize.w).toBeGreaterThan(0);
      expect(widget.minSize.h).toBeGreaterThan(0);
    });
  });

  it("registers widgets with data source configuration", () => {
    getAllWidgets().forEach((widget) => {
      expect(widget.dataSource).toBeDefined();
      expect(widget.dataSource.refreshMs).toBeGreaterThan(0);
    });
  });

  it("groups registered widgets by category", () => {
    const charts = getWidgetsByCategory("CHART");

    expect(charts.length).toBeGreaterThan(0);
    charts.forEach((widget) => {
      expect(widget.category).toBe("CHART");
    });
  });
});
