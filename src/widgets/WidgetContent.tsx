import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  allocation,
  alerts,
  holdings,
  news,
  performance,
  sectors,
  summary,
} from "../data/mockData";
import {
  fetchHoldings,
  fetchNews,
  fetchAlerts,
  fetchRisk,
  fetchPerformance,
  fetchMarketOverview,
} from "../data/api";
import { useWidgetData } from "../hooks/useWidgetData";
import { getWidgetConfig } from "../utils/widgetConfig";
import { eventBus } from "../data/eventBus";
import type { Holding } from "../types/widget";
import {
  brinsonAttribution,
  calculateDrawdowns,
  correlation,
  historicalVaR,
  parametricVaR,
} from "../finance/analytics";
function Allocation() {
  const refreshInterval =
    getWidgetConfig("allocation").refreshInterval ?? 30000;

  const {
    data: marketOverview,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "allocation",
    queryFn: fetchMarketOverview,
    refreshMs: refreshInterval,
  });

  const chartAllocation = marketOverview?.allocation ?? allocation;

  return (
    <div className="chart-wrap">
      <div
        className="widget-data-status"
        role="status"
        aria-live="polite"
      >
        {isLoading && <small>Loading allocation data...</small>}

        {!isLoading && status === "stale" && (
          <small>Showing stale allocation data</small>
        )}

        {isRefreshing && !isLoading && (
          <small>Updating allocation...</small>
        )}

        {isError && (
          <small>
            API error: {error?.message ?? "Unable to refresh allocation"}
          </small>
        )}

        {isError && (
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            Retry
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartAllocation}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="78%"
            paddingAngle={3}
          >
            {chartAllocation.map((a) => (
              <Cell key={a.name} fill={a.color} />
            ))}
          </Pie>

          <Tooltip formatter={(v) => `${v}%`} />
        </PieChart>
      </ResponsiveContainer>

      <div className="legend">
        {chartAllocation.map((a) => (
          <span key={a.name}>
            <i style={{ background: a.color }} />
            {a.name}
            <b>{a.value}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function Performance() {
    const refreshInterval =
    getWidgetConfig("performance").refreshInterval ?? 30000;

  const {
    data: apiPerformance,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "performance",
    queryFn: fetchPerformance,
    refreshMs: refreshInterval,
  });

  const chartBase = apiPerformance ?? performance;
  const [liveTicks, setLiveTicks] = useState<
    Record<string, { price: number; changePct: number }>
  >({});

  // Subscribe to real-time market updates.
  useEffect(() => {
    return eventBus.on("PRICE_TICK", (tick) => {
      setLiveTicks((current) => ({
        ...current,
        [tick.ticker]: {
          price: tick.price,
          changePct: tick.changePct,
        },
      }));
    });
  }, []);

  const liveData = useMemo(() => {
    const stockChanges = Object.entries(liveTicks)
      .filter(([ticker]) => ticker !== "NIFTY")
      .map(([, value]) => value.changePct);

    const averageChange =
      stockChanges.length > 0
        ? stockChanges.reduce((total, value) => total + value, 0) /
          stockChanges.length
        : 0;

    const niftyChange = liveTicks.NIFTY?.changePct ?? 0;

    const lastPoint = chartBase[chartBase.length - 1];

    if (!lastPoint) {
      return {
        chartData: chartBase,
        portfolioReturn: 11.62,
        benchmarkReturn: 9.84,
      };
    }

    const livePoint = {
      ...lastPoint,
      day: "LIVE",
      portfolio: lastPoint.portfolio * (1 + averageChange / 100),
      benchmark: lastPoint.benchmark * (1 + niftyChange / 100),
    };

    return {
      chartData: [...chartBase, livePoint],
      portfolioReturn: 11.62 + averageChange,
      benchmarkReturn: 9.84 + niftyChange,
    };
  }, [liveTicks, chartBase]);

  const formatReturn = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

  return (
    <div className="chart-wrap">
            {isLoading && (
        <div role="status" className="data-note">
          Loading performance data...
        </div>
      )}

      {status === "stale" && (
        <div role="status" className="data-note">
          Performance data is stale. Refreshing...
        </div>
      )}

      {status === "success" && isRefreshing && (
        <div role="status" className="data-note">
          Updating performance data...
        </div>
      )}

      {isError && (
        <div role="alert" className="data-note">
          <span>
            Performance API error:{" "}
            {error instanceof Error
              ? error.message
              : "Unable to load performance data."}
          </span>

          <button
            className="tiny-btn"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}
      <div className="chart-kpis">
        <span>
          Portfolio{" "}
          <b
            className={liveData.portfolioReturn >= 0 ? "positive" : "negative"}
          >
            {formatReturn(liveData.portfolioReturn)}
          </b>
        </span>

        <span>
          NIFTY 50{" "}
          <b
            className={liveData.benchmarkReturn >= 0 ? "positive" : "negative"}
          >
            {formatReturn(liveData.benchmarkReturn)}
          </b>
        </span>
      </div>

      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={liveData.chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "var(--muted)" }}
            interval={6}
          />

          <YAxis
            domain={["dataMin - 2", "dataMax + 2"]}
            tick={{ fontSize: 9, fill: "var(--muted)" }}
          />

          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />

          <Line
            type="monotone"
            dataKey="portfolio"
            name="Portfolio"
            stroke="#6d8cff"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="benchmark"
            name="NIFTY 50"
            stroke="#35c9a5"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Heatmap() {
  const refreshInterval =
    getWidgetConfig("heatmap").refreshInterval ?? 30000;

  const {
    data: marketOverview,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "heatmap",
    queryFn: fetchMarketOverview,
    refreshMs: refreshInterval,
  });

  const [liveChanges, setLiveChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    return eventBus.on("PRICE_TICK", (tick) => {
      setLiveChanges((current) => ({
        ...current,
        [tick.ticker]: tick.changePct,
      }));
    });
  }, []);

  const baseSectors = marketOverview?.sectors ?? sectors;

  const sectorStocks: Record<string, string[]> = {
    Technology: ["TCS", "INFY"],
    Financials: ["HDFCBANK"],
    Energy: ["RELIANCE"],
  };

  const liveSectors = useMemo(() => {
    return baseSectors.map((sector) => {
      const symbols = sectorStocks[sector.name] ?? [];

      const changes = symbols
        .filter((symbol) => liveChanges[symbol] !== undefined)
        .map((symbol) => liveChanges[symbol]);

      const liveChange =
        changes.length > 0
          ? changes.reduce((total, value) => total + value, 0) /
            changes.length
          : sector.change;

      return {
        ...sector,
        liveChange,
      };
    });
  }, [baseSectors, liveChanges]);

  return (
    <div className="heatmap">
      <div className="widget-data-status" role="status" aria-live="polite">
        {isLoading && <small>Loading sector data...</small>}

        {!isLoading && status === "stale" && (
          <small>Showing stale sector data</small>
        )}

        {isRefreshing && !isLoading && (
          <small>Updating sectors...</small>
        )}

        {isError && (
          <small>
            API error: {error?.message ?? "Unable to load sectors"}
          </small>
        )}

        {isError && (
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            Retry
          </button>
        )}
      </div>

      {liveSectors.map((s) => (
        <div
          key={s.name}
          className="heat-cell"
          style={{
            flex: `${s.value} 1 20%`,
            background:
              s.liveChange >= 0
                ? "rgba(38,190,139,.18)"
                : "rgba(240,92,105,.18)",
            borderColor:
              s.liveChange >= 0
                ? "rgba(38,190,139,.45)"
                : "rgba(240,92,105,.45)",
          }}
        >
          <b>{s.name}</b>

          <strong className={s.liveChange >= 0 ? "positive" : "negative"}>
            {s.liveChange > 0 ? "+" : ""}
            {s.liveChange.toFixed(2)}%
          </strong>

          <small>{s.value}% weight</small>
        </div>
      ))}
    </div>
  );
}

function Holdings() {
  const refreshInterval = getWidgetConfig("holdings").refreshInterval ?? 30000;

  const {
    data: apiHoldings,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData<Holding[]>({
    widgetId: "holdings",
    queryFn: fetchHoldings,
    refreshMs: refreshInterval,
  });

  const [liveHoldings, setLiveHoldings] = useState<Holding[]>(holdings);

  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<"marketValue" | "pnl">("marketValue");

  // Update holdings when API data arrives.
  useEffect(() => {
    if (apiHoldings) {
      setLiveHoldings(apiHoldings);
    }
  }, [apiHoldings]);

  // Preserve real-time market price updates.
  useEffect(() => {
    return eventBus.on("PRICE_TICK", (tick) => {
      setLiveHoldings((current) =>
        current.map((h) =>
          h.ticker === tick.ticker
            ? {
                ...h,
                price: tick.price,
                marketValue: h.quantity * tick.price,
                pnl: tick.changePct,
              }
            : h,
        ),
      );
    });
  }, []);

  const rows = useMemo(
    () =>
      liveHoldings
        .filter((h) =>
          `${h.ticker} ${h.name} ${h.sector}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        )
        .sort((a, b) => b[sort] - a[sort]),
    [liveHoldings, searchQuery, sort],
  );

  const csv = () => {
    const data = [
      "Ticker,Name,Sector,Price,Market Value,PnL,Weight",
      ...rows.map(
        (h) =>
          `${h.ticker},${h.name},${h.sector},${h.price},${h.marketValue},${h.pnl},${h.weight}`,
      ),
    ].join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    a.download = "meridian-holdings.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="table-area">
      {isLoading && (
        <div role="status" className="data-note">
          Loading holdings...
        </div>
      )}

      {status === "stale" && (
        <div role="status" className="data-note">
          Holdings data is stale. Refreshing...
        </div>
      )}

      {status === "success" && isRefreshing && (
        <div role="status" className="data-note">
          Updating holdings...
        </div>
      )}

      {isError && (
        <div role="alert" className="data-note">
          <span>
            Holdings API error:{" "}
            {error instanceof Error
              ? error.message
              : "Unable to load holdings."}
          </span>

          <button
            className="tiny-btn"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      <div className="table-tools">
        <input
          aria-label="Search holdings"
          placeholder="Search ticker or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <button
          className="tiny-btn"
          onClick={() => setSort((s) => (s === "pnl" ? "marketValue" : "pnl"))}
        >
          Sort: {sort === "pnl" ? "P&L" : "Value"}
        </button>

        <button className="tiny-btn" onClick={csv}>
          Export CSV
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Sector</th>
              <th>Price</th>
              <th>Market value</th>
              <th>Day %</th>
              <th>Weight</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((h: Holding) => (
              <tr
                key={h.ticker}
                onClick={() =>
                  eventBus.emit("SYMBOL_SELECTED", {
                    symbol: h.ticker,
                  })
                }
              >
                <td>
                  <b>{h.ticker}</b>
                  <small>{h.name}</small>
                </td>

                <td>{h.sector}</td>

                <td>₹{h.price.toLocaleString("en-IN")}</td>

                <td>{(h.marketValue / 1e6).toFixed(1)}M</td>

                <td className={h.pnl >= 0 ? "positive" : "negative"}>
                  {h.pnl > 0 ? "+" : ""}
                  {h.pnl}%
                </td>

                <td>{h.weight}%</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>No holdings found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function News() {
  const refreshInterval = getWidgetConfig("news").refreshInterval ?? 30000;

  const {
    data: apiNews,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "news",
    queryFn: fetchNews,
    refreshMs: refreshInterval,
  });

  const displayedNews = apiNews ?? news;

  const getSourceClass = (source: string) => {
    const name = source.toLowerCase();

    if (name.includes("reuters")) return "reuters";
    if (name.includes("economic")) return "economic-times";
    if (name.includes("bloomberg")) return "bloomberg";

    return "default";
  };

  return (
    <div className="news-feed">
      <div className="news-feed-heading">
        <div>
          <span className="news-eyebrow">MARKET INTELLIGENCE</span>
          <h4>Latest market updates</h4>
        </div>

        <span className="news-live">
          <i />
          LIVE FEED
        </span>
      </div>

      {isLoading && (
        <div role="status" className="data-note">
          Loading market news...
        </div>
      )}

      {status === "stale" && (
        <div role="status" className="data-note">
          News data is stale. Refreshing...
        </div>
      )}

      {status === "success" && isRefreshing && (
        <div role="status" className="data-note">
          Updating market news...
        </div>
      )}

      {isError && (
        <div role="alert" className="data-note">
          <span>
            News API error:{" "}
            {error instanceof Error ? error.message : "Unable to load news."}
          </span>

          <button
            className="tiny-btn"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      <div className="news-list">
        {displayedNews.map((n, i) => (
          <article className="news-card" key={`${n.source}-${i}`}>
            <div className="news-card-top">
              <div className="news-source-group">
                <span className={`news-source ${getSourceClass(n.source)}`}>
                  {n.source}
                </span>

                <span className="news-time">{n.time}</span>
              </div>

              <span className={`news-sentiment ${n.sentiment.toLowerCase()}`}>
                <i />
                {n.sentiment}
              </span>
            </div>

            <h4 className="news-headline">{n.title}</h4>

            <p className="news-summary">{n.summary}</p>

            <div className="news-card-footer">
              <span>MARKET UPDATE</span>

              <span className="news-number">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="news-footer">
        <span>{displayedNews.length} market updates available</span>

        <span className="news-footer-status">
          <i />
          All sources synced
        </span>
      </div>
    </div>
  );
}

function Alerts() {
  const refreshInterval = getWidgetConfig("alerts").refreshInterval ?? 15000;

  const {
    data: apiAlerts,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "alerts",
    queryFn: fetchAlerts,
    refreshMs: refreshInterval,
  });

  const [dismissed, setDismissed] = useState<string[]>([]);
  const [streamAlerts, setStreamAlerts] = useState<
    {
      id: string;
      message: string;
      time: string;
      severity: "warning" | "info";
    }[]
  >([]);

  // Same stock ke liye baar-baar alert aane se rokta hai.
  const lastAlertTime = useRef<Record<string, number>>({});

  useEffect(() => {
    return eventBus.on("PRICE_TICK", (tick) => {
      const threshold = 0.12;
      const cooldown = 15000;
      const now = Date.now();

      if (Math.abs(tick.changePct) < threshold) return;

      const previousAlert = lastAlertTime.current[tick.ticker] ?? 0;
      if (now - previousAlert < cooldown) return;

      lastAlertTime.current[tick.ticker] = now;

      const direction = tick.changePct >= 0 ? "increased" : "decreased";

      const time = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setStreamAlerts((current) =>
        [
          {
            id: `${tick.ticker}-${tick.sequence}`,
            message: `${tick.ticker} price ${direction} by ${Math.abs(
              tick.changePct,
            ).toFixed(2)}%`,
            time,
            severity: (Math.abs(tick.changePct) >= 0.14
              ? "warning"
              : "info") as "warning" | "info",
          },
          ...current,
        ].slice(0, 8),
      );
    });
  }, []);

  const allAlerts = [
    ...streamAlerts,
    ...(apiAlerts ?? alerts).map((alert) => ({
      ...alert,
      id: String(alert.id),
    })),
  ];

  return (
    <div className="feed">
      {isLoading && (
        <div role="status" className="data-note">
          Loading alerts...
        </div>
      )}

      {status === "stale" && (
        <div role="status" className="data-note">
          Alert data is stale. Refreshing...
        </div>
      )}

      {status === "success" && isRefreshing && (
        <div role="status" className="data-note">
          Updating alerts...
        </div>
      )}

      {isError && (
        <div role="alert" className="data-note">
          <span>
            Alerts API error:{" "}
            {error instanceof Error ? error.message : "Unable to load alerts."}
          </span>

          <button
            className="tiny-btn"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}
      {allAlerts
        .filter((alert) => !dismissed.includes(alert.id))
        .map((alert) => (
          <div className="alert-item" key={alert.id}>
            <span className={`severity ${alert.severity}`} />

            <div>
              <b>{alert.message}</b>
              <small>
                {alert.time} IST · {alert.severity.toUpperCase()}
              </small>
            </div>

            <button
              aria-label="Dismiss alert"
              className="icon-btn"
              onClick={() => setDismissed((current) => [...current, alert.id])}
            >
              ×
            </button>
          </div>
        ))}

      {allAlerts.every((alert) => dismissed.includes(alert.id)) && (
        <div className="empty-state">No active alerts</div>
      )}
    </div>
  );
}

function VaR() {
  const refreshInterval = getWidgetConfig("var").refreshInterval ?? 30000;

  const {
    data: riskData,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "var",
    queryFn: fetchRisk,
    refreshMs: refreshInterval,
  });
  const [method, setMethod] = useState<"historical" | "parametric">(
    "historical",
  );
  const [confidence, setConfidence] = useState(0.99);
  const returns = performance
    .slice(1)
    .map((p, i) => p.portfolio / performance[i].portfolio - 1);
  const result =
    method === "historical"
      ? historicalVaR(returns, 45e9, confidence)
      : parametricVaR(returns, 45e9, confidence);
  const limit = 11e6;
  const pct = Math.min(100, (result.value / limit) * 100);
  return (
    <div className="var-box">
      {isLoading && (
        <div role="status" className="data-note">
          Loading risk metrics...
        </div>
      )}

      {status === "stale" && (
        <div role="status" className="data-note">
          Risk data is stale. Refreshing...
        </div>
      )}

      {status === "success" && isRefreshing && (
        <div role="status" className="data-note">
          Updating risk metrics...
        </div>
      )}

      {isError && (
        <div role="alert" className="data-note">
          <span>
            Risk API error:{" "}
            {error instanceof Error
              ? error.message
              : "Unable to load risk metrics."}
          </span>

          <button
            className="tiny-btn"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}
      <div className="table-tools">
        <select
          aria-label="VaR method"
          value={method}
          onChange={(e) =>
            setMethod(e.target.value as "historical" | "parametric")
          }
        >
          <option value="historical">Historical</option>
          <option value="parametric">Parametric</option>
        </select>
        <select
          aria-label="VaR confidence"
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
        >
          <option value={0.95}>95%</option>
          <option value={0.99}>99%</option>
          <option value={0.995}>99.5%</option>
        </select>
      </div>
      <div className="gauge">
        <div className="gauge-inner">
          <strong>${(result.value / 1e6).toFixed(2)}M</strong>
          <small>1-day VaR</small>
        </div>
      </div>
      <div className="var-foot">
        <span>{(confidence * 100).toFixed(1)}% confidence</span>
        <b className="warning-text">{pct.toFixed(0)}% of $11M limit</b>
        {riskData && (
          <div className="var-foot">
            <small>
              API max drawdown: {Number(riskData.maxDrawdown).toFixed(2)}%
            </small>
          </div>
        )}
      </div>
      <div className="progress">
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="var-foot">
        <small>
          {method} simulation · {result.observations} observations
        </small>
        <small>ES ${(result.expectedShortfall / 1e6).toFixed(2)}M</small>
      </div>
    </div>
  );
}


function Correlation() {
  const refreshInterval =
    getWidgetConfig("correlation").refreshInterval ?? 30000;

  const {
    data: riskData,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "correlation",
    queryFn: fetchRisk,
    refreshMs: refreshInterval,
  });

  const [lookback, setLookback] = useState(30);

  const [liveChanges, setLiveChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    return eventBus.on("PRICE_TICK", (tick) => {
      setLiveChanges((current) => ({
        ...current,
        [tick.ticker]: tick.changePct,
      }));
    });
  }, []);

  const names = ["NIFTY", "TCS", "INFY", "HDFCBANK", "RELIANCE"];

  const fallbackMatrix = useMemo(() => {
    const base = performance
      .slice(1)
      .map(
        (point, index) =>
          point.portfolio / performance[index].portfolio - 1,
      )
      .slice(-lookback);

    const series = names.map((name, index) => {
      const historicalSeries = base.map(
        (value, i) =>
          value * (0.45 + index * 0.09) +
          Math.sin((i + 1) * (index + 2)) * 0.002,
      );

      const liveChange = liveChanges[name];

      if (liveChange !== undefined) {
        historicalSeries.push(liveChange / 100);
      }

      return historicalSeries;
    });

    return names.map((name, i) => ({
      name,
      values: names.map((_, j) =>
        i === j ? 1 : correlation(series[i], series[j]),
      ),
    }));
  }, [lookback, liveChanges]);

  const matrix =
    riskData?.correlations?.length
      ? riskData.correlations
      : fallbackMatrix;

  const matrixNames = matrix.map((row) => row.name);

  return (
    <div>
      <div className="widget-data-status" role="status" aria-live="polite">
        {isLoading && <small>Loading correlation data...</small>}

        {!isLoading && status === "stale" && (
          <small>Showing stale correlation data</small>
        )}

        {isRefreshing && !isLoading && (
          <small>Updating correlation data...</small>
        )}

        {isError && (
          <small>
            API error: {error?.message ?? "Unable to load correlation data"}
          </small>
        )}

        {isError && (
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            Retry
          </button>
        )}
      </div>

      <div className="table-tools">
        <span>
          {riskData?.correlations?.length
            ? "API correlation matrix"
            : "Rolling return correlation"}
        </span>

        {!riskData?.correlations?.length && (
          <select
            aria-label="Correlation lookback"
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={252}>252 days</option>
          </select>
        )}
      </div>

      <div className="corr-grid">
        {matrix.map((row) => (
          <div className="corr-row" key={row.name}>
            <b>{row.name}</b>

            {row.values.map((value, i) => (
              <span
                key={`${row.name}-${i}`}
                title={`${row.name} / ${matrixNames[i] ?? `Asset ${i + 1}`}: ${value.toFixed(2)}`}
                style={{
                  background:
                    value < 0
                      ? "rgba(88,145,245,.8)"
                      : value > 0.65
                        ? "rgba(240,92,105,.75)"
                        : `rgba(180,180,190,${0.18 + value * 0.35})`,
                }}
              >
                {value.toFixed(2)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}


function Attribution() {
  const refreshInterval =
    getWidgetConfig("attribution").refreshInterval ?? 30000;

  const {
    data: apiHoldings,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData<Holding[]>({
    widgetId: "attribution",
    queryFn: fetchHoldings,
    refreshMs: refreshInterval,
  });

  const [liveChanges, setLiveChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    return eventBus.on("PRICE_TICK", (tick) => {
      setLiveChanges((current) => ({
        ...current,
        [tick.ticker]: tick.changePct,
      }));
    });
  }, []);

  // Existing benchmark assumptions are retained.
  const sectorDefaults = [
    {
      sector: "Technology",
      portfolioWeight: 0.28,
      benchmarkWeight: 0.24,
      portfolioReturn: 0.13,
      benchmarkReturn: 0.1,
      symbols: ["TCS", "INFY"],
    },
    {
      sector: "Financials",
      portfolioWeight: 0.24,
      benchmarkWeight: 0.26,
      portfolioReturn: 0.08,
      benchmarkReturn: 0.09,
      symbols: ["HDFCBANK"],
    },
    {
      sector: "Energy",
      portfolioWeight: 0.16,
      benchmarkWeight: 0.12,
      portfolioReturn: 0.15,
      benchmarkReturn: 0.11,
      symbols: ["RELIANCE"],
    },
    {
      sector: "Industrials",
      portfolioWeight: 0.12,
      benchmarkWeight: 0.14,
      portfolioReturn: 0.09,
      benchmarkReturn: 0.1,
      symbols: [],
    },
  ];

  const rows = useMemo(() => {
    const sourceHoldings = apiHoldings ?? holdings;

    const attributionInputs = sectorDefaults.map((item) => {
      const positions = sourceHoldings.filter(
        (holding) => holding.sector === item.sector,
      );

      const totalWeight = positions.reduce(
        (total, holding) => total + holding.weight,
        0,
      );

      const weightedReturn = positions.reduce(
        (total, holding) => total + holding.pnl * holding.weight,
        0,
      );

      const portfolioWeight =
        positions.length > 0
          ? totalWeight / 100
          : item.portfolioWeight;

      const portfolioReturn =
        totalWeight > 0
          ? weightedReturn / totalWeight / 100
          : (() => {
              const changes = item.symbols
                .filter((symbol) => liveChanges[symbol] !== undefined)
                .map((symbol) => liveChanges[symbol]);

              return (
                item.portfolioReturn +
                (changes.length > 0
                  ? changes.reduce((sum, value) => sum + value, 0) /
                    changes.length /
                    100
                  : 0)
              );
            })();

      return {
        sector: item.sector,
        portfolioWeight,
        benchmarkWeight: item.benchmarkWeight,
        portfolioReturn,
        benchmarkReturn: item.benchmarkReturn,
      };
    });

    return brinsonAttribution(attributionInputs);
  }, [apiHoldings, liveChanges]);

  const data = rows.map((row) => ({
    name: row.sector,
    allocation: row.allocation * 10000,
    selection: row.selection * 10000,
    interaction: row.interaction * 10000,
  }));

  return (
    <div
      className="widget-chart"
      role="img"
      aria-label="Performance attribution by sector"
      style={{ width: "100%", height: "100%", minHeight: 180 }}
    >
      <div className="widget-data-status" role="status" aria-live="polite">
        {isLoading && <small>Loading attribution holdings...</small>}

        {!isLoading && status === "stale" && (
          <small>Showing stale attribution data</small>
        )}

        {isRefreshing && !isLoading && (
          <small>Updating attribution data...</small>
        )}

        {isError && (
          <small>
            API error: {error?.message ?? "Unable to load attribution data"}
          </small>
        )}

        {isError && (
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            Retry
          </button>
        )}
      </div>

      <div className="sr-only">
        Performance attribution data:
        {data.map((item) => (
          <span key={item.name}>
            {item.name}: allocation {item.allocation.toFixed(2)} basis points,
            selection {item.selection.toFixed(2)} basis points, interaction{" "}
            {item.interaction.toFixed(2)} basis points.
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height="100%" minHeight={180}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 4, left: -20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "var(--muted)" }}
          />
          <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} />
          <Tooltip />
          <Bar dataKey="allocation" stackId="a" fill="#6d8cff" />
          <Bar dataKey="selection" stackId="a" fill="#35c9a5" />
          <Bar dataKey="interaction" stackId="a" fill="#f6b85b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Ticker() {
  const refreshInterval =
    getWidgetConfig("ticker").refreshInterval ?? 30000;

  const {
    data: apiHoldings,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData<Holding[]>({
    widgetId: "ticker",
    queryFn: fetchHoldings,
    refreshMs: refreshInterval,
  });

  const [livePrices, setLivePrices] = useState<
    Record<string, { price: number; changePct: number }>
  >({});

  useEffect(() => {
    return eventBus.on("PRICE_TICK", (tick) => {
      setLivePrices((current) => ({
        ...current,
        [tick.ticker]: {
          price: tick.price,
          changePct: tick.changePct,
        },
      }));
    });
  }, []);

  
const basePrices = useMemo<
  Record<string, { price: number; changePct: number }>
>(() => {
  const stockPrices = Object.fromEntries(
    (apiHoldings ?? holdings).map((holding) => [
      holding.ticker,
      {
        price: holding.price,
        changePct: holding.pnl,
      },
    ]),
  );

  return {
    NIFTY: {
      price: 24328.15,
      changePct: 0.82,
    },
    ...stockPrices,
  };
}, [apiHoldings]);

  const items = [
    { ticker: "NIFTY", label: "NIFTY 50" },
    { ticker: "RELIANCE", label: "RELIANCE" },
    { ticker: "TCS", label: "TCS" },
    { ticker: "INFY", label: "INFOSYS" },
    { ticker: "HDFCBANK", label: "HDFC BANK" },
  ];

  const formatPrice = (value: number) =>
    value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div>
      <div className="widget-data-status" aria-live="polite">
        {isLoading && <span>Loading ticker data...</span>}

        {status === "stale" && (
          <span>Showing stale ticker data</span>
        )}

        {isRefreshing && <span>Updating ticker data...</span>}

        {isError && (
          <span>
            Unable to refresh ticker data: {error?.message}
            <button type="button" onClick={() => refresh()}>
              Retry
            </button>
          </span>
        )}
      </div>

      <div className="ticker">
        {[...items, ...items].map((item, index) => {
          const stock =
            livePrices[item.ticker] ?? basePrices[item.ticker];

          if (!stock) return null;

          return (
            <span key={`${item.ticker}-${index}`}>
              {item.label} {formatPrice(stock.price)}{" "}
              <strong
                className={
                  stock.changePct >= 0 ? "positive" : "negative"
                }
              >
                {stock.changePct > 0 ? "+" : ""}
                {stock.changePct.toFixed(2)}%
              </strong>
            </span>
          );
        })}
      </div>
    </div>
  );
}



function Drawdown() {
  const refreshInterval =
    getWidgetConfig("drawdown").refreshInterval ?? 30000;

  const {
    data: riskData,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "drawdown",
    queryFn: fetchRisk,
    refreshMs: refreshInterval,
  });

  const [liveChanges, setLiveChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    return eventBus.on("PRICE_TICK", (tick) => {
      setLiveChanges((current) => ({
        ...current,
        [tick.ticker]: tick.changePct,
      }));
    });
  }, []);

  const data = useMemo(() => {
    if (riskData?.drawdown?.length) {
      return riskData.drawdown;
    }

    const stockChanges = Object.entries(liveChanges)
      .filter(([ticker]) => ticker !== "NIFTY")
      .map(([, change]) => change);

    const averageChange =
      stockChanges.length > 0
        ? stockChanges.reduce((total, value) => total + value, 0) /
          stockChanges.length
        : 0;

    const historicalValues = performance.map((point) => point.portfolio);

    const lastValue =
      historicalValues[historicalValues.length - 1] ?? 100;

    const liveValue = lastValue * (1 + averageChange / 100);

    const values = [...historicalValues, liveValue];

    let peak = values[0] ?? 100;

    return values.map((value, index) => {
      peak = Math.max(peak, value);

      return {
        day:
          index === values.length - 1
            ? "LIVE"
            : performance[index]?.day ?? "LIVE",
        drawdown: ((value - peak) / peak) * 100,
      };
    });
  }, [riskData?.drawdown, liveChanges]);

  const maximumDrawdownValue =
    riskData?.maxDrawdown ??
    (data.length > 0
      ? Math.min(...data.map((point) => point.drawdown))
      : 0);

  return (
    <div
      className="widget-chart"
      role="img"
      aria-label={`Historical portfolio drawdown. Maximum drawdown: ${maximumDrawdownValue.toFixed(2)}%.`}
      style={{ width: "100%", height: "100%", minHeight: 180 }}
    >
      <div className="widget-data-status" role="status" aria-live="polite">
        {isLoading && <small>Loading drawdown data...</small>}

        {!isLoading && status === "stale" && (
          <small>Showing stale drawdown data</small>
        )}

        {isRefreshing && !isLoading && (
          <small>Updating drawdown data...</small>
        )}

        {isError && (
          <small>
            API error: {error?.message ?? "Unable to load drawdown data"}
          </small>
        )}

        {isError && (
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            Retry
          </button>
        )}
      </div>

      <div className="sr-only">
        Historical portfolio drawdown data.
        Maximum drawdown: {maximumDrawdownValue.toFixed(2)}%.

        {data.map((point, index) => (
          <span key={`${point.day}-${index}`}>
            {point.day}: {point.drawdown.toFixed(2)}%.
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height="100%" minHeight={180}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "var(--muted)" }}
            interval={7}
          />

          <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} unit="%" />

          <Tooltip />

          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#f06b76"
            fill="rgba(240,107,118,.2)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}



function Treemap() {
  const refreshInterval =
    getWidgetConfig("treemap").refreshInterval ?? 30000;

  const {
    data: marketOverview,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
    status,
  } = useWidgetData({
    widgetId: "treemap",
    queryFn: fetchMarketOverview,
    refreshMs: refreshInterval,
  });

  const chartAllocation =
    marketOverview?.allocation ?? allocation;

  const totalValue = chartAllocation.reduce(
    (total, item) => total + item.value,
    0,
  );

  return (
    <div className="treemap-container">
      <div
        className="widget-data-status"
        role="status"
        aria-live="polite"
      >
        {isLoading && <small>Loading allocation data...</small>}

        {!isLoading && status === "stale" && (
          <small>Showing stale allocation data</small>
        )}

        {isRefreshing && !isLoading && (
          <small>Updating allocation...</small>
        )}

        {isError && (
          <small>
            API error: {error?.message ?? "Unable to load allocation"}
          </small>
        )}

        {isError && (
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            Retry
          </button>
        )}
      </div>

      <div
        className="treemap"
        role="group"
        aria-label="Portfolio asset allocation"
      >
        {chartAllocation.map((item) => {
          const percentage =
            totalValue > 0
              ? (item.value / totalValue) * 100
              : 0;

          return (
            <div
              key={item.name}
              className="tree-allocation-cell"
              style={{
                flex: `${Math.max(item.value, 1)} 1 0`,
                background: item.color,
                minWidth: 0,
              }}
              aria-label={`${item.name}: ${item.value}%`}
            >
              <b>{item.name}</b>
              <strong>{item.value}%</strong>
              <small>{percentage.toFixed(1)}% of allocation</small>
            </div>
          );
        })}
      </div>

      <div className="treemap-footer">
        <span>Asset allocation</span>
        <b>{totalValue.toFixed(1)}% total</b>
      </div>
    </div>
  );
}

const content: Record<string, () => JSX.Element> = {
  allocation: Allocation,
  performance: Performance,
  heatmap: Heatmap,
  holdings: Holdings,
  news: News,
  alerts: Alerts,
  var: VaR,
  correlation: Correlation,
  attribution: Attribution,
  ticker: Ticker,
  drawdown: Drawdown,
  treemap: Treemap,
};
export function WidgetContent({
  id,
  refreshKey = 0,
}: {
  id: string;
  refreshKey?: number;
}) {
  const Component = content[id];

  return Component ? (
    <Component key={`${id}-${refreshKey}`} />
  ) : (
    <div className="empty-state">Widget not found</div>
  );
}
export const widgetMeta: Record<
  string,
  {
    title: string;
    subtitle: string;
    size: { w: number; h: number };
    min: { w: number; h: number };
  }
> = {
  allocation: {
    title: "Portfolio Allocation",
    subtitle: "Asset class exposure",
    size: { w: 4, h: 4 },
    min: { w: 3, h: 3 },
  },
  performance: {
    title: "Performance Overview",
    subtitle: "Portfolio vs benchmark · 1M",
    size: { w: 8, h: 4 },
    min: { w: 4, h: 3 },
  },
  heatmap: {
    title: "Sector Heat Map",
    subtitle: "Daily sector performance",
    size: { w: 4, h: 4 },
    min: { w: 3, h: 3 },
  },
  holdings: {
    title: "Top Holdings",
    subtitle: "Live portfolio positions",
    size: { w: 8, h: 5 },
    min: { w: 4, h: 4 },
  },
  news: {
    title: "News & Research",
    subtitle: "Market intelligence",
    size: { w: 4, h: 4 },
    min: { w: 3, h: 3 },
  },
  alerts: {
    title: "Alerts & Notifications",
    subtitle: "Risk and portfolio events",
    size: { w: 4, h: 3 },
    min: { w: 3, h: 2 },
  },
  var: {
    title: "Value at Risk",
    subtitle: "Portfolio risk monitor",
    size: { w: 4, h: 3 },
    min: { w: 3, h: 2 },
  },
  correlation: {
    title: "Correlation Matrix",
    subtitle: "60-day rolling correlation",
    size: { w: 4, h: 4 },
    min: { w: 3, h: 3 },
  },
  attribution: {
    title: "Performance Attribution",
    subtitle: "Brinson effects · bps",
    size: { w: 4, h: 4 },
    min: { w: 3, h: 3 },
  },
  ticker: {
    title: "Market Overview",
    subtitle: "Global indices & commodities",
    size: { w: 12, h: 1 },
    min: { w: 6, h: 1 },
  },
  drawdown: {
    title: "Drawdown Analysis",
    subtitle: "Historical portfolio drawdown",
    size: { w: 6, h: 4 },
    min: { w: 3, h: 3 },
  },
  treemap: {
    title: "Exposure Treemap",
    subtitle: "Geographic allocation",
    size: { w: 6, h: 4 },
    min: { w: 3, h: 3 },
  },
};
export const summaryData = summary;
