
import { describe, expect, it } from "vitest";
import { isValidLayoutItems } from "./layoutValidation";

describe("Dashboard Layout Validation", () => {
  it("accepts a valid layout", () => {
    expect(
      isValidLayoutItems(
        [{ i: "performance", x: 0, y: 0, w: 6, h: 4 }],
        12
      )
    ).toBe(true);
  });

  it("rejects duplicate widget IDs", () => {
    expect(
      isValidLayoutItems(
        [
          { i: "performance", x: 0, y: 0, w: 6, h: 4 },
          { i: "performance", x: 6, y: 0, w: 6, h: 4 },
        ],
        12
      )
    ).toBe(false);
  });

  it("rejects negative positions", () => {
    expect(
      isValidLayoutItems(
        [{ i: "performance", x: -1, y: 0, w: 4, h: 4 }],
        12
      )
    ).toBe(false);
  });

  it("rejects invalid dimensions", () => {
    expect(
      isValidLayoutItems(
        [{ i: "performance", x: 0, y: 0, w: 0, h: 4 }],
        12
      )
    ).toBe(false);
  });

  it("rejects widgets outside grid boundaries", () => {
    expect(
      isValidLayoutItems(
        [{ i: "performance", x: 10, y: 0, w: 4, h: 4 }],
        12
      )
    ).toBe(false);
  });

  it("rejects non-integer positions", () => {
    expect(
      isValidLayoutItems(
        [{ i: "performance", x: 1.5, y: 0, w: 4, h: 4 }],
        12
      )
    ).toBe(false);
  });

  it("rejects non-array input", () => {
    expect(isValidLayoutItems(null, 12)).toBe(false);
  });

  it("accepts an empty layout", () => {
    expect(isValidLayoutItems([], 12)).toBe(true);
  });
});
