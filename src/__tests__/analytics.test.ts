import { describe, it, expect } from "vitest";
import {
  brinsonAttribution,
  calculateDrawdowns,
  correlation,
  historicalVaR,
  maximumDrawdown,
  parametricVaR,
  sharpeRatio,
} from "../finance/analytics";
const returns = [
  0.01, -0.02, 0.015, -0.005, 0.008, -0.012, 0.004, 0.009, -0.003, 0.006,
];
describe("financial analytics", () => {
  it("calculates historical VaR and expected shortfall", () => {
    const r = historicalVaR(returns, 1_000_000, 0.9, 1);
    expect(r.value).toBeGreaterThan(0);
    expect(r.expectedShortfall).toBeGreaterThanOrEqual(r.value);
    expect(r.observations).toBe(10);
  });
  it("calculates parametric VaR", () => {
    const r = parametricVaR(returns, 1_000_000, 0.99, 1);
    expect(r.value).toBeGreaterThan(0);
    expect(r.method).toBe("parametric");
  });
  it("rejects unsupported parametric confidence levels", () =>
    expect(() => parametricVaR(returns, 1e6, 0.92)).toThrow(
      /Supported confidence/,
    ));
  it("calculates running peak and drawdown", () => {
    const points = calculateDrawdowns([100, 110, 99, 105]);
    expect(points[0].drawdown).toBe(0);
    expect(points[2].drawdown).toBeCloseTo(-0.1);
    expect(points[3].drawdown).toBeCloseTo(105 / 110 - 1);
    expect(maximumDrawdown([100, 110, 99, 105])).toBeCloseTo(-0.1);
  });
  it("calculates annualised Sharpe ratio", () =>
    expect(Number.isFinite(sharpeRatio(returns))).toBe(true));
  it("decomposes Brinson effects", () => {
    const rows = brinsonAttribution([
      {
        sector: "Tech",
        portfolioWeight: 0.6,
        benchmarkWeight: 0.5,
        portfolioReturn: 0.12,
        benchmarkReturn: 0.1,
      },
      {
        sector: "Banks",
        portfolioWeight: 0.4,
        benchmarkWeight: 0.5,
        portfolioReturn: 0.08,
        benchmarkReturn: 0.09,
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].total).toBeCloseTo(
      rows[0].allocation + rows[0].selection + rows[0].interaction,
    );
  });
  it("computes correlation and handles constant series", () => {
    expect(correlation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(correlation([1, 1, 1], [2, 3, 4])).toBe(0);
  });
  it("validates invalid data", () => {
    expect(() => historicalVaR([1], 100)).toThrow();
    expect(() => calculateDrawdowns([100, 0])).toThrow();
  });
});
