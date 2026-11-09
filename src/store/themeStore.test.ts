import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "./themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().resetTheme();
  });

  it("starts with default theme settings", () => {
    const state = useThemeStore.getState();

    expect(state.theme).toBe("dark");
    expect(state.accentColor).toBe("#6d8cff");
    expect(state.customColors).toEqual({});
  });

  it("changes the theme", () => {
    useThemeStore.getState().setTheme("light");

    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("accepts valid six-digit accent colors", () => {
    useThemeStore.getState().setAccentColor("#ff8800");

    expect(useThemeStore.getState().accentColor).toBe("#ff8800");
  });

  it("accepts valid three-digit accent colors", () => {
    useThemeStore.getState().setAccentColor("#abc");

    expect(useThemeStore.getState().accentColor).toBe("#abc");
  });

  it("rejects invalid accent colors", () => {
    const original = useThemeStore.getState().accentColor;

    useThemeStore.getState().setAccentColor("red");

    expect(useThemeStore.getState().accentColor).toBe(original);
  });

  it("rejects malformed hex colors", () => {
    const original = useThemeStore.getState().accentColor;

    useThemeStore.getState().setAccentColor("#12345");

    expect(useThemeStore.getState().accentColor).toBe(original);
  });

  it("sets a custom color", () => {
    useThemeStore.getState().setCustomColor("primary", "#123456");

    expect(
      useThemeStore.getState().customColors.primary,
    ).toBe("#123456");
  });

  it("supports multiple custom colors", () => {
    const store = useThemeStore.getState();

    store.setCustomColor("primary", "#123456");
    useThemeStore.getState().setCustomColor("secondary", "#abcdef");

    expect(useThemeStore.getState().customColors).toEqual({
      primary: "#123456",
      secondary: "#abcdef",
    });
  });

  it("does not accept an empty custom color key", () => {
    useThemeStore.getState().setCustomColor("   ", "#123456");

    expect(useThemeStore.getState().customColors).toEqual({});
  });

  it("does not accept invalid custom colors", () => {
    useThemeStore.getState().setCustomColor("primary", "blue");

    expect(useThemeStore.getState().customColors).toEqual({});
  });

  it("resets all theme settings", () => {
    const store = useThemeStore.getState();

    store.setTheme("light");
    store.setAccentColor("#ff0000");
    store.setCustomColor("primary", "#123456");

    useThemeStore.getState().resetTheme();

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(useThemeStore.getState().accentColor).toBe("#6d8cff");
    expect(useThemeStore.getState().customColors).toEqual({});
  });
});