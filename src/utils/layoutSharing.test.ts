
import { describe, it, expect } from "vitest";
import {
  createShareUrl,
  readSharedLayout,
} from "./layoutSharing";
import type { SavedLayout } from "../layout/serializer";

const sampleLayout: SavedLayout = {
  version: "1.0.0",
  name: "My Dashboard",
  theme: "dark",
  widgets: [
    { i: "performance", x: 0, y: 0, w: 6, h: 4 },
    { i: "holdings", x: 6, y: 0, w: 6, h: 4 },
  ],
};

describe("layout sharing", () => {
  it("creates a shareable URL", () => {
    const url = createShareUrl(
      sampleLayout,
      "https://example.com/dashboard",
    );

    expect(url).toContain("#shared-layout=");
  });

  it("restores a shared layout from URL hash", () => {
    const url = createShareUrl(
      sampleLayout,
      "https://example.com/dashboard",
    );

    const hash = new URL(url).hash;
    const restored = readSharedLayout(hash);

    expect(restored).toEqual(sampleLayout);
  });

  it("returns null for a URL without shared layout", () => {
    expect(readSharedLayout("#home")).toBeNull();
  });

  it("rejects an empty shared layout", () => {
    expect(() =>
      readSharedLayout("#shared-layout="),
    ).toThrow();
  });

  it("rejects malformed encoded data", () => {
    expect(() =>
      readSharedLayout("#shared-layout=%invalid"),
    ).toThrow();
  });

  it("rejects an oversized shared URL", () => {
    const oversizedHash =
      "#shared-layout=" + "a".repeat(9000);

    expect(() =>
      readSharedLayout(oversizedHash),
    ).toThrow();
  });
});
