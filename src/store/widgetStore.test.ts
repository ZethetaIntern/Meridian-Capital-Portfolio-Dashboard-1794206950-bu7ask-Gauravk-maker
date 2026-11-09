import { beforeEach, describe, expect, it } from "vitest";
import { useWidgetStore } from "./widgetStore";

describe("widgetStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useWidgetStore.getState().resetAllWidgetSettings();
  });

  it("starts with empty widget settings", () => {
    expect(useWidgetStore.getState().widgetSettings).toEqual({});
  });

  it("updates widget settings with default values", () => {
    useWidgetStore.getState().updateWidgetSettings("performance", {
      title: "Performance Overview",
    });

    expect(
      useWidgetStore.getState().widgetSettings.performance,
    ).toEqual({
      title: "Performance Overview",
      refreshInterval: 30000,
      enabled: true,
    });
  });

  it("merges updated settings without losing existing values", () => {
    const store = useWidgetStore.getState();

    store.updateWidgetSettings("holdings", {
      title: "My Holdings",
    });

    useWidgetStore.getState().updateWidgetSettings("holdings", {
      enabled: false,
    });

    expect(
      useWidgetStore.getState().widgetSettings.holdings,
    ).toEqual({
      title: "My Holdings",
      refreshInterval: 30000,
      enabled: false,
    });
  });

  it("toggles a widget from enabled to disabled", () => {
    useWidgetStore.getState().toggleWidget("allocation");

    expect(
      useWidgetStore.getState().widgetSettings.allocation.enabled,
    ).toBe(false);
  });

  it("toggles a disabled widget back to enabled", () => {
    useWidgetStore.getState().updateWidgetSettings("news", {
      enabled: false,
    });

    useWidgetStore.getState().toggleWidget("news");

    expect(
      useWidgetStore.getState().widgetSettings.news.enabled,
    ).toBe(true);
  });

  it("uses default settings when toggling an unknown widget", () => {
    useWidgetStore.getState().toggleWidget("new-widget");

    expect(
      useWidgetStore.getState().widgetSettings["new-widget"],
    ).toEqual({
      refreshInterval: 30000,
      enabled: false,
    });
  });

  it("sets refresh interval correctly", () => {
    useWidgetStore.getState().setRefreshInterval("alerts", 5000);

    expect(
      useWidgetStore.getState().widgetSettings.alerts.refreshInterval,
    ).toBe(5000);
  });

  it("does not allow refresh interval below 1000ms", () => {
    useWidgetStore.getState().setRefreshInterval("alerts", 200);

    expect(
      useWidgetStore.getState().widgetSettings.alerts.refreshInterval,
    ).toBe(1000);
  });

  it("resets settings for a specific widget", () => {
    const store = useWidgetStore.getState();

    store.updateWidgetSettings("news", { title: "News" });
    store.updateWidgetSettings("alerts", { title: "Alerts" });

    useWidgetStore.getState().resetWidgetSettings("news");

    expect(
      useWidgetStore.getState().widgetSettings.news,
    ).toBeUndefined();

    expect(
      useWidgetStore.getState().widgetSettings.alerts,
    ).toBeDefined();
  });

  it("resets all widget settings", () => {
    const store = useWidgetStore.getState();

    store.updateWidgetSettings("news", { title: "News" });
    store.updateWidgetSettings("alerts", { title: "Alerts" });

    useWidgetStore.getState().resetAllWidgetSettings();

    expect(useWidgetStore.getState().widgetSettings).toEqual({});
  });
});