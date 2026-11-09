
import { z } from "zod";

import {
  summary,
  holdings,
  performance,
  sectors,
  allocation,
  news,
  alerts,
  correlations,
  drawdown,
} from "./mockData";

import { simulateMockLatency } from "./mockLatency";

import type { Holding, PortfolioSummary } from "../types/widget";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/+$/, "");

// --------------------------------------------------
// ZOD RESPONSE SCHEMAS
// --------------------------------------------------

const PortfolioSchema = z.object({
  aum: z.number(),
  dailyPnL: z.number(),
  dailyPnLPercent: z.number(),
  mtdReturn: z.number(),
  ytdReturn: z.number(),
  sharpeRatio: z.number(),
  lastUpdated: z.string(),
});

const HoldingSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  sector: z.string(),
  assetClass: z.string(),
  quantity: z.number(),
  price: z.number(),
  marketValue: z.number(),
  pnl: z.number(),
  weight: z.number(),
});

const PerformanceSchema = z.array(
  z.object({
    day: z.string(),
    portfolio: z.number(),
    benchmark: z.number(),
  }),
);

const RiskSchema = z.object({
  var95: z.number(),
  var99: z.number(),
  maxDrawdown: z.number(),
  drawdown: z.array(
    z.object({
      day: z.string(),
      drawdown: z.number(),
    }),
  ),
  correlations: z.array(
    z.object({
      name: z.string(),
      values: z.array(z.number()),
    }),
  ),
});

const MarketOverviewSchema = z.object({
  sectors: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      change: z.number(),
    }),
  ),
  allocation: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      color: z.string(),
    }),
  ),
});

const NewsSchema = z.array(
  z.object({
    source: z.string(),
    title: z.string(),
    time: z.string(),
    sentiment: z.string(),
    summary: z.string(),
  }),
);

const AlertsSchema = z.array(
  z.object({
    id: z.number(),
    severity: z.enum(["info", "warning", "critical"]),
    message: z.string(),
    time: z.string(),
  }),
);

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type PortfolioData = PortfolioSummary;
export type HoldingsData = Holding[];
export type PerformanceData = z.infer<typeof PerformanceSchema>;
export type RiskData = z.infer<typeof RiskSchema>;
export type MarketOverviewData = z.infer<
  typeof MarketOverviewSchema
>;
export type NewsData = z.infer<typeof NewsSchema>;
export type AlertsData = z.infer<typeof AlertsSchema>;

// --------------------------------------------------
// COMMON API REQUEST WITH ZOD VALIDATION
// --------------------------------------------------

async function request<T>(
  endpoint: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  const result = schema.safeParse(data);

  if (!result.success) {
    throw new Error(
      `Invalid API response for ${endpoint}: ${result.error.message}`,
    );
  }

  return result.data;
}

// --------------------------------------------------
// API 1: PORTFOLIO SUMMARY
// GET /api/portfolio/:id
// Latency: 50ms
// --------------------------------------------------

export async function fetchPortfolio(
  portfolioId = "default",
): Promise<PortfolioData> {
  if (!API_BASE_URL) {
  return simulateMockLatency(summary, "fast").then((data) => ({
    ...data,
    lastUpdated: new Date().toISOString(),
  }));
}

  return request(
    `/api/portfolio/${encodeURIComponent(portfolioId)}`,
    PortfolioSchema,
  );
}

// --------------------------------------------------
// API 2: HOLDINGS
// GET /api/holdings
// Latency: 200ms
// --------------------------------------------------

export async function fetchHoldings(): Promise<HoldingsData> {
  if (!API_BASE_URL) {
    return simulateMockLatency(holdings, "normal");
  }

  return request("/api/holdings", HoldingSchema.array());
}

// --------------------------------------------------
// API 3: PERFORMANCE
// GET /api/performance
// Latency: 500ms
// --------------------------------------------------

export async function fetchPerformance(): Promise<PerformanceData> {
  if (!API_BASE_URL) {
    return simulateMockLatency(performance, "slow");
  }

  return request("/api/performance", PerformanceSchema);
}

// --------------------------------------------------
// API 4: RISK ANALYTICS
// GET /api/risk
// Latency: 500ms
// --------------------------------------------------

export async function fetchRisk(): Promise<RiskData> {
  if (!API_BASE_URL) {
    const maxDrawdown = Math.min(
      ...drawdown.map((item) => item.drawdown),
    );

    return simulateMockLatency(
      {
        var95: summary.aum * 0.018,
        var99: summary.aum * 0.027,
        maxDrawdown,
        drawdown,
        correlations,
      },
      "slow",
    );
  }

  return request("/api/risk", RiskSchema);
}

// --------------------------------------------------
// API 5: MARKET OVERVIEW
// GET /api/market/overview
// Latency: 200ms
// --------------------------------------------------

export async function fetchMarketOverview(): Promise<MarketOverviewData> {
  if (!API_BASE_URL) {
    return simulateMockLatency(
      {
        sectors,
        allocation,
      },
      "normal",
    );
  }

  return request("/api/market/overview", MarketOverviewSchema);
}

// --------------------------------------------------
// API 6: FINANCIAL NEWS
// GET /api/news
// Latency: 500ms
// --------------------------------------------------

export async function fetchNews(): Promise<NewsData> {
  if (!API_BASE_URL) {
    return simulateMockLatency(news, "slow");
  }

  return request("/api/news", NewsSchema);
}

// --------------------------------------------------
// API 7: PORTFOLIO ALERTS
// GET /api/alerts
// Latency: 50ms
// --------------------------------------------------

export async function fetchAlerts(): Promise<AlertsData> {
  if (!API_BASE_URL) {
    const mockAlerts: AlertsData = alerts.map((alert) => ({
      ...alert,
      severity: alert.severity as "warning" | "info" | "critical",
    }));

    return simulateMockLatency(mockAlerts, "fast");
  }

  return request("/api/alerts", AlertsSchema);
}
