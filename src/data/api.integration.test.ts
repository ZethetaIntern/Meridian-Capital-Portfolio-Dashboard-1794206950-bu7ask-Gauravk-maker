
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { summary, holdings, performance, sectors, allocation, news, alerts, correlations, drawdown } from "./mockData";

const mockFetch = vi.fn();

const riskData = {
  var95: summary.aum * 0.018,
  var99: summary.aum * 0.027,
  maxDrawdown: Math.min(...drawdown.map((item) => item.drawdown)),
  drawdown,
  correlations,
};

const apiCases = [
  {
    name: "portfolio",
    endpoint: "/api/portfolio/default",
    data: summary,
    call: (api: any) => api.fetchPortfolio(),
  },
  {
    name: "holdings",
    endpoint: "/api/holdings",
    data: holdings,
    call: (api: any) => api.fetchHoldings(),
  },
  {
    name: "performance",
    endpoint: "/api/performance",
    data: performance,
    call: (api: any) => api.fetchPerformance(),
  },
  {
    name: "risk",
    endpoint: "/api/risk",
    data: riskData,
    call: (api: any) => api.fetchRisk(),
  },
  {
    name: "market overview",
    endpoint: "/api/market/overview",
    data: { sectors, allocation },
    call: (api: any) => api.fetchMarketOverview(),
  },
  {
    name: "news",
    endpoint: "/api/news",
    data: news,
    call: (api: any) => api.fetchNews(),
  },
  {
    name: "alerts",
    endpoint: "/api/alerts",
    data: alerts,
    call: (api: any) => api.fetchAlerts(),
  },
];

describe("API integration and response validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com/");
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function loadApi() {
    return import("./api");
  }

  it.each(apiCases)(
    "fetches and validates $name successfully",
    async ({ endpoint, data, call }) => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => data,
      });

      const api = await loadApi();
      const result = await call(api);

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.example.com${endpoint}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );
    },
  );

  it("encodes portfolio ID and removes trailing slash from base URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => summary,
    });

    const api = await loadApi();

    await api.fetchPortfolio("client / 123");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/api/portfolio/client%20%2F%20123",
      expect.any(Object),
    );
  });

  it("throws an error when the server returns an unsuccessful status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const api = await loadApi();

    await expect(api.fetchHoldings()).rejects.toThrow(
      "API request failed: 500 Internal Server Error",
    );
  });

  it("throws an error when the API response fails Zod validation", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        aum: "not-a-number",
      }),
    });

    const api = await loadApi();

    await expect(api.fetchPortfolio()).rejects.toThrow(
      "Invalid API response for /api/portfolio/default",
    );
  });

  it("propagates network errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network unavailable"));

    const api = await loadApi();

    await expect(api.fetchHoldings()).rejects.toThrow(
      "Network unavailable",
    );
  });

  it("propagates JSON parsing errors", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    const api = await loadApi();

    await expect(api.fetchNews()).rejects.toThrow("Invalid JSON");
  });
});
