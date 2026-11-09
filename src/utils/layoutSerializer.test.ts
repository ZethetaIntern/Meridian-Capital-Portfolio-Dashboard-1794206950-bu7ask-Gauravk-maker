
import { describe, expect, it } from "vitest";
import { exportLayout, importLayout } from "./layoutSerializer";

const validLayouts = {
  lg: [{ i: "performance", x: 0, y: 0, w: 6, h: 4 }],
  md: [{ i: "performance", x: 0, y: 0, w: 6, h: 4 }],
  sm: [{ i: "performance", x: 0, y: 0, w: 4, h: 4 }],
  xs: [{ i: "performance", x: 0, y: 0, w: 2, h: 4 }],
};

describe("Dashboard Layout Serializer", () => {
  it("exports a valid layout", () => {
    const result = exportLayout(validLayouts);
    expect(JSON.parse(result).version).toBe(1);
  });

  it("imports a valid layout", () => {
    const exported = exportLayout(validLayouts);
    expect(importLayout(exported)).toEqual(validLayouts);
  });

  it("rejects invalid JSON", () => {
    expect(() => importLayout("{invalid")).toThrow("Invalid JSON");
  });

  it("rejects unsupported versions", () => {
    const file = JSON.stringify({
      version: 99,
      layouts: validLayouts,
    });

    expect(() => importLayout(file)).toThrow(
      "Unsupported layout file version"
    );
  });

  it("rejects missing layouts", () => {
    expect(() =>
      importLayout(JSON.stringify({ version: 1 }))
    ).toThrow("Layout data is missing");
  });

  it("rejects invalid breakpoint layouts", () => {
    const file = JSON.stringify({
      version: 1,
      layouts: {
        ...validLayouts,
        lg: [{ i: "test", x: 10, y: 0, w: 5, h: 4 }],
      },
    });

    expect(() => importLayout(file)).toThrow(
      "Invalid layout for breakpoint: lg"
    );
  });

  it("rejects duplicate widget IDs", () => {
    const file = JSON.stringify({
      version: 1,
      layouts: {
        ...validLayouts,
        lg: [
          { i: "performance", x: 0, y: 0, w: 6, h: 4 },
          { i: "performance", x: 6, y: 0, w: 6, h: 4 },
        ],
      },
    });

    expect(() => importLayout(file)).toThrow();
  });
});
