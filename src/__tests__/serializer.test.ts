import { describe, it, expect, beforeEach } from "vitest";
import {
  deserializeLayout,
  serializeLayout,
  saveLayout,
  loadLayout,
} from "../layout/serializer";
const layout = {
  version: "1.0.0",
  name: "Test layout",
  theme: "dark" as const,
  widgets: [{ i: "allocation", x: 0, y: 0, w: 4, h: 3 }],
};
describe("layout persistence", () => {
  beforeEach(() => localStorage.clear());
  it("round trips valid JSON", () =>
    expect(deserializeLayout(serializeLayout(layout))).toEqual(layout));
  it("rejects malformed layout data", () =>
    expect(() => deserializeLayout('{"theme":"bad"}')).toThrow());
  it("saves and loads from local storage", () => {
    saveLayout(layout);
    expect(loadLayout()).toEqual(layout);
  });
  it("returns null when no saved layout exists", () =>
    expect(loadLayout()).toBeNull());
  it("rejects duplicate widget IDs", () =>
    expect(() =>
      deserializeLayout(
        JSON.stringify({
          ...layout,
          widgets: [...layout.widgets, ...layout.widgets],
        }),
      ),
    ).toThrow(/unique/));
  it("rejects layouts above 50KB", () =>
    expect(() => deserializeLayout(" ".repeat(50 * 1024 + 1))).toThrow(/50KB/));
});
