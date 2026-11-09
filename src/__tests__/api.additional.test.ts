import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPortfolio, fetchHoldings } from "../data/api";
import { summary, holdings } from "../data/mockData";

afterEach(() => {
  vi.useRealTimers();
});

describe("portfolio API mock", () => {
  it("returns a fresh ISO timestamp and preserves summary metrics", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));

    const resultPromise = fetchPortfolio();

    await vi.advanceTimersByTimeAsync(120);
    const result = await resultPromise;

    expect(result).toEqual({
      ...summary,
      lastUpdated: "2026-01-02T03:04:05.050Z",
    });
    expect(new Date(result.lastUpdated).toISOString()).toBe(result.lastUpdated);
  });

  it("returns the holdings collection after its async delay", async () => {
    vi.useFakeTimers();

    const resultPromise = fetchHoldings();

    await vi.advanceTimersByTimeAsync(200);
    const result = await resultPromise;

    expect(result).toBe(holdings);
    expect(result.length).toBeGreaterThan(0);
  });
});
