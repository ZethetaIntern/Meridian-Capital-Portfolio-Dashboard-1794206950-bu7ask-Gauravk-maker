
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import type { WidgetDefinition } from "../types/widget";
import {
  clearRegistry,
  getAllWidgets,
  getWidget,
  getWidgetsByCategory,
  hasWidget,
  registerWidget,
  unregisterWidget,
  validateWidgetConfig,
} from "./widgetRegistry";

const createTestWidget = (): WidgetDefinition =>
  ({
    id: "test-widget",
    name: "Test Widget",
    description: "A test widget for registry validation",
    title: "Test Widget",
    category: "CHART",
    icon: "chart",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 8, h: 6 },
    defaultConfig: { showLegend: true },
    configSchema: z.object({
      showLegend: z.boolean(),
    }),
    component: () => null,
    dataSource: {
      refreshMs: 5000,
      enabled: true,
    },
  }) as WidgetDefinition;

describe("Widget Registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers a widget successfully", () => {
    registerWidget(createTestWidget());

    expect(hasWidget("test-widget")).toBe(true);
  });

  it("retrieves a registered widget", () => {
    const widget = createTestWidget();
    registerWidget(widget);

    expect(getWidget("test-widget")).toBe(widget);
  });

  it("returns all registered widgets", () => {
    registerWidget(createTestWidget());

    expect(getAllWidgets()).toHaveLength(1);
  });

  it("rejects duplicate widget registration", () => {
    registerWidget(createTestWidget());

    expect(() => registerWidget(createTestWidget())).toThrow();
  });

  it("validates correct widget configuration", () => {
    registerWidget(createTestWidget());

    const result = validateWidgetConfig("test-widget", {
      showLegend: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid widget configuration", () => {
    registerWidget(createTestWidget());

    const result = validateWidgetConfig("test-widget", {
      showLegend: "invalid",
    });

    expect(result.success).toBe(false);
  });

  it("unregisters a widget", () => {
    registerWidget(createTestWidget());

    unregisterWidget("test-widget");

    expect(hasWidget("test-widget")).toBe(false);
  });

  it("clears all registered widgets", () => {
    registerWidget(createTestWidget());

    clearRegistry();

    expect(getAllWidgets()).toHaveLength(0);
  });

it("filters widgets by category", () => {
  const chartWidget = createTestWidget();

  const tableWidget = {
    ...createTestWidget(),
    id: "test-table",
    category: "TABLE",
  } as WidgetDefinition;

  registerWidget(chartWidget);
  registerWidget(tableWidget);

  const charts = getWidgetsByCategory("CHART");
  const tables = getWidgetsByCategory("TABLE");

  expect(charts).toHaveLength(1);
  expect(tables).toHaveLength(1);
  expect(charts[0].id).toBe("test-widget");
  expect(tables[0].id).toBe("test-table");
});

it("returns undefined for an unknown widget", () => {
  expect(getWidget("unknown-widget")).toBeUndefined();
});

it("returns false when unregistering an unknown widget", () => {
  expect(unregisterWidget("unknown-widget")).toBe(false);
});

it("does not contain an unregistered widget", () => {
  registerWidget(createTestWidget());

  unregisterWidget("test-widget");

  expect(getAllWidgets()).toHaveLength(0);
});

it("handles configuration validation for unknown widgets", () => {
  const result = validateWidgetConfig("unknown-widget", {});

  expect(result.success).toBe(false);
});
});
