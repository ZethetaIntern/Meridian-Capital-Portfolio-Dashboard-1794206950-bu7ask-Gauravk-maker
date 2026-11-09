import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useSessionTimeout } from "./auth/useSessionTimeout";
import { RotateCcw } from "lucide-react";
import { getRolePermissions } from "./auth/permissions";
import type { PortfolioSummary } from "./types/widget";
import { Share2, Download, X } from "lucide-react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { isValidLayoutItems } from "./utils/layoutValidation";
import type { Layout } from "react-grid-layout";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  Expand,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Pause,
  Play,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Moon,
  Upload,
} from "lucide-react";
import { useAuth } from "./auth/AuthContext";
import AuthPage from "./pages/AuthPage";
import { Settings2 } from "lucide-react";
import {
  getWidgetConfig,
  getAllWidgetConfigs,
  saveWidgetConfig,
  deleteWidgetConfig,
  replaceAllWidgetConfigs,
} from "./utils/widgetConfig";
import {
  getLayoutHistory,
  saveLayoutSnapshot,
  deleteLayoutSnapshot,
  type LayoutSnapshot,
} from "./utils/layoutHistory";
import { fetchPortfolio } from "./data/api";
import { useDashboardStore, type ThemeName } from "./store/dashboardStore";
import { useLiveClock } from "./hooks/useLiveClock";
import { useWidgetStore } from "./store/widgetStore";
import { useThemeStore } from "./store/themeStore";
import { useLayoutStore } from "./store/layoutStore";
import { createShareUrl, readSharedLayout } from "./utils/layoutSharing";
import { WidgetContent, widgetMeta } from "./widgets/WidgetContent";
import { WidgetErrorBoundary } from "./components/WidgetErrorBoundary";
import { useMarketStream } from "./hooks/useMarketStream";
import {
  deserializeLayout,
  serializeLayout,
  type SavedLayout,
  MAX_LAYOUT_BYTES,
} from "./layout/serializer";
import "./index.css";
const ResponsiveGrid = WidthProvider(Responsive);

const createResponsiveLayouts = (): Record<string, Layout[]> => {
  const make = (
    items: Array<[string, number, number, number, number]>,
    columns: number,
  ): Layout[] =>
    items.map(([i, x, y, w, h]) => ({
      i,
      x,
      y,
      w,
      h,
      minW: Math.min(2, columns),
      minH: i === "ticker" ? 1 : 2,
      maxW: columns,
      maxH: 8,
    }));
  return {
    lg: make(
      [
        ["performance", 0, 0, 12, 4],
        ["heatmap", 0, 4, 12, 4],
        ["holdings", 0, 8, 12, 5],
        ["news", 0, 13, 6, 4],
        ["alerts", 6, 13, 6, 4],
        ["var", 0, 17, 6, 4],
        ["correlation", 6, 17, 6, 4],
        ["attribution", 0, 21, 6, 4],
        ["drawdown", 6, 21, 6, 4],
        ["ticker", 0, 25, 12, 1],
        ["treemap", 0, 26, 12, 4],
        ["allocation", 0, 30, 6, 4],
      ],
      12,
    ),
    md: make(
      [
        ["performance", 0, 0, 8, 4],
        ["heatmap", 0, 4, 8, 3],
        ["holdings", 0, 7, 8, 5],
        ["news", 0, 12, 4, 4],
        ["alerts", 4, 12, 4, 4],
        ["var", 0, 16, 4, 4],
        ["correlation", 4, 16, 4, 4],
        ["attribution", 0, 20, 4, 4],
        ["drawdown", 4, 20, 4, 4],
        ["ticker", 0, 24, 8, 1],
        ["treemap", 0, 25, 8, 4],
        ["allocation", 0, 29, 4, 4],
      ],
      8,
    ),

    sm: make(
      [
        ["performance", 0, 0, 4, 4],
        ["heatmap", 0, 4, 4, 4],
        ["holdings", 0, 8, 4, 5],
        ["news", 0, 13, 4, 4],
        ["alerts", 0, 17, 4, 4],
        ["var", 0, 21, 4, 4],
        ["correlation", 0, 24, 4, 4],
        ["attribution", 0, 29, 4, 4],
        ["drawdown", 0, 33, 4, 4],
        ["ticker", 0, 37, 4, 1],
        ["treemap", 0, 38, 4, 4],
        ["allocation", 0, 42, 4, 4],
      ],
      4,
    ),

    xs: make(
      [
        ["performance", 0, 0, 2, 4],
        ["heatmap", 0, 4, 2, 4],
        ["holdings", 0, 8, 2, 5],
        ["news", 0, 13, 2, 4],
        ["alerts", 0, 17, 2, 4],
        ["var", 0, 21, 2, 4],
        ["correlation", 0, 25, 2, 4],
        ["attribution", 0, 29, 2, 4],
        ["drawdown", 0, 33, 2, 4],
        ["ticker", 0, 37, 2, 1],
        ["treemap", 0, 38, 2, 4],
        ["allocation", 0, 42, 2, 4],
      ],
      2,
    ),
  };
};
const initialLayouts = createResponsiveLayouts();
const LAYOUT_STORAGE_KEY = "meridian-grid-layout-v5";
const LEGACY_LAYOUT_STORAGE_KEY = "meridian-grid-layout-v4";

type DashboardLayouts = ReturnType<typeof createResponsiveLayouts>;

function isValidLayouts(value: unknown): value is DashboardLayouts {
  if (!value || typeof value !== "object") {
    return false;
  }

  const layouts = value as Record<string, unknown>;

  const breakpointColumns: Record<string, number> = {
    lg: 12,
    md: 8,
    sm: 4,
    xs: 2,
  };

  return Object.entries(breakpointColumns).every(([breakpoint, columns]) =>
    isValidLayoutItems(layouts[breakpoint], columns),
  );
}

const currency = (n: number) => `$${(n / 1e9).toFixed(2)}B`;
const formatPnL = (value: number) => {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${(Math.abs(value) / 1e6).toFixed(2)}M`;
};
function DashboardApp() {
  const [widgetConfigVersion, setWidgetConfigVersion] = useState(0);
  const { user, role, signOut } = useAuth();

  const permissions = getRolePermissions(role);
  const canEditDashboard = permissions.canEditDashboard;
  const canConfigureWidgets = permissions.canConfigureWidgets;
  useSessionTimeout();
  const displayName =
    user?.user_metadata?.full_name?.trim() || "Portfolio User";

  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const initials = displayName
    .split(/\s+/)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const {
    theme,
    setTheme,
    activeWidgets,
    addWidget,
    removeWidget,
    paused,
    togglePause,
    reset,
  } = useDashboardStore();
  const {
    widgetSettings,
    updateWidgetSettings,
    resetWidgetSettings,
    resetAllWidgetSettings,
    toggleWidget,
  } = useWidgetStore();

  const {
    accentColor,
    setAccentColor,
    setTheme: setStoredTheme,
    resetTheme,
  } = useThemeStore();

  const {
    savedLayouts,
    saveLayout: saveStoredLayout,
    loadLayout: getStoredLayout,
    deleteLayout: deleteStoredLayout,
    resetLayouts,
  } = useLayoutStore();

  const [widgetRefreshKeys, setWidgetRefreshKeys] = useState<
    Record<string, number>
  >({});

  const refreshWidget = (id: string) => {
    setWidgetRefreshKeys((current) => ({
      ...current,
      [id]: (current[id] ?? 0) + 1,
    }));
  };

  useEffect(() => {
    const configs = getAllWidgetConfigs();

    const timers = Object.entries(configs)
      .filter(
        ([, config]) =>
          typeof config.refreshInterval === "number" &&
          config.refreshInterval >= 1000,
      )
      .map(([id, config]) =>
        window.setInterval(() => {
          setWidgetRefreshKeys((current) => ({
            ...current,
            [id]: (current[id] ?? 0) + 1,
          }));
        }, config.refreshInterval!),
      );

    return () => {
      timers.forEach((timer) => window.clearInterval(timer));
    };
  }, [widgetConfigVersion]);

  const configureWidget = (id: string) => {
    if (!canConfigureWidgets) {
      notify("You do not have permission to configure widgets.");
      return;
    }
    const currentConfig = getWidgetConfig(id);

    const currentTitle =
      widgetSettings[id]?.title ??
      currentConfig.title ??
      widgetMeta[id]?.title ??
      id;

    const newTitle = window.prompt("Enter widget title:", currentTitle);

    if (newTitle === null) return;

    if (!newTitle.trim()) {
      notify("Widget title cannot be empty.");
      return;
    }

    const currentInterval = String(
      widgetSettings[id]?.refreshInterval ??
        currentConfig.refreshInterval ??
        30000,
    );

    const newInterval = window.prompt(
      "Refresh interval in milliseconds (1000–300000):",
      currentInterval,
    );

    if (newInterval === null) return;

    const refreshInterval = Number(newInterval);

    if (
      !Number.isFinite(refreshInterval) ||
      !Number.isInteger(refreshInterval) ||
      refreshInterval < 1000 ||
      refreshInterval > 300000
    ) {
      notify("Refresh interval must be between 1000 and 300000 ms.");
      return;
    }

    const title = newTitle.trim().slice(0, 60);

    try {
      saveWidgetConfig(id, {
        title,
        refreshInterval,
      });

      updateWidgetSettings(id, {
        title,
        refreshInterval,
        enabled: true,
      });

      setWidgetConfigVersion((version) => version + 1);

      refreshWidget(id);

      notify(
        `${widgetMeta[id]?.title ?? id} settings saved. Refresh: ${refreshInterval / 1000}s`,
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to save widget configuration.",
      );
    }
  };
  const notifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (notifyTimeoutRef.current !== null) {
        clearTimeout(notifyTimeoutRef.current);
        notifyTimeoutRef.current = null;
      }
    };
  }, []);
  const resetWidgetConfiguration = (id: string) => {
    if (!canConfigureWidgets) {
      notify("You do not have permission to reset widget settings.");
      return;
    }
    try {
      deleteWidgetConfig(id);
      resetWidgetSettings(id);

      setWidgetConfigVersion((version) => version + 1);

      setWidgetRefreshKeys((current) => ({
        ...current,
        [id]: (current[id] ?? 0) + 1,
      }));

      notify("Widget settings restored to defaults.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to reset widget settings.",
      );
    }
  };

  const [layoutHistory, setLayoutHistory] = useState<LayoutSnapshot[]>(() =>
    getLayoutHistory(),
  );
  const [layouts, setLayouts] = useState<DashboardLayouts>(() => {
    try {
      const currentSaved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      const legacySaved = localStorage.getItem(LEGACY_LAYOUT_STORAGE_KEY);

      const saved = currentSaved || legacySaved;

      if (saved) {
        const parsed = JSON.parse(saved);

        if (isValidLayouts(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard layout:", error);
    }

    return createResponsiveLayouts();
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [compact, setCompact] = useState(false);
  const now = useLiveClock();
  const streamStatus = useMarketStream(paused);

  const {
    data: portfolio,
    isLoading: portfolioLoading,
    isError: portfolioError,
    error: portfolioErrorMessage,
    refetch: refetchPortfolio,
    isFetching: portfolioFetching,
  } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => fetchPortfolio(),
    refetchInterval: paused ? false : 10000,
    retry: 2,
    staleTime: 5000,
  });

  const metrics: PortfolioSummary = portfolio ?? {
    aum: 45e9,
    dailyPnL: 12.45e6,
    dailyPnLPercent: 0.28,
    mtdReturn: 2.84,
    ytdReturn: 11.62,
    sharpeRatio: 1.74,
    lastUpdated: new Date().toISOString(),
  };

  useEffect(() => {
    if (!window.location.hash.startsWith("#shared-layout=")) {
      return;
    }

    try {
      const sharedLayout = readSharedLayout(window.location.hash);

      if (!sharedLayout) return;

      const unknownWidget = sharedLayout.widgets.find(
        (widget) => !widgetMeta[widget.i],
      );

      if (unknownWidget) {
        throw new Error(`Unknown widget: ${unknownWidget.i}`);
      }

      if (!isValidLayoutItems(sharedLayout.widgets, 12)) {
        throw new Error("Shared dashboard layout is invalid.");
      }

      const sharedConfigs = sharedLayout.widgetConfigs;

      if (sharedConfigs) {
        for (const id of Object.keys(sharedConfigs)) {
          if (!widgetMeta[id]) {
            throw new Error(`Unknown widget configuration: ${id}`);
          }
        }

        replaceAllWidgetConfigs(sharedConfigs);

        setWidgetConfigVersion((version) => version + 1);
      }

      setLayouts({
        ...createResponsiveLayouts(),
        lg: sharedLayout.widgets.map((widget) => ({
          ...widget,
          minW: Math.min(2, widget.w),
          minH: 1,
          maxW: 12,
          maxH: 8,
        })),
      });

      if (sharedLayout.theme) {
        setTheme(sharedLayout.theme);
      }

      notify("Shared dashboard and widget settings loaded successfully.");

      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to load shared dashboard.",
      );
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    // Keep ThemeStore synchronized with DashboardStore.
    setStoredTheme(theme);

    // Expose accent color as a CSS custom property.
    document.documentElement.style.setProperty("--accent", accentColor);
  }, [theme, accentColor, setStoredTheme]);
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
    } catch (error) {
      console.error("Failed to save dashboard layout:", error);
    }
  }, [layouts]);
  const enabledWidgetIds = useMemo(
    () =>
      activeWidgets.filter(
        (id) => widgetMeta[id] && (widgetSettings[id]?.enabled ?? true),
      ),
    [activeWidgets, widgetSettings],
  );

  const shownWidgets = useMemo(
    () =>
      enabledWidgetIds.filter((id) =>
        `${widgetMeta[id].title} ${widgetMeta[id].subtitle}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [enabledWidgetIds, search],
  );
  const notify = (message: string) => {
  setToast(message);

  if (notifyTimeoutRef.current !== null) {
    clearTimeout(notifyTimeoutRef.current);
  }

  notifyTimeoutRef.current = setTimeout(() => {
    setToast("");
    notifyTimeoutRef.current = null;
  }, 2500);
};
  // Navigate to a dashboard widget from the sidebar

  const openWidget = (widgetId: string, section: string) => {
    setActiveSection(section);
    setSearch("");

    // Restore widget if it was removed
    if (!activeWidgets.includes(widgetId)) {
      if (!canEditDashboard) {
        notify("This widget is not currently available in your dashboard.");
        return;
      }

      addWidget(widgetId);
    }

    // Scroll after React updates the dashboard
    window.setTimeout(() => {
      const element = document.getElementById(`widget-${widgetId}`);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else {
        console.warn(`Widget not found: ${widgetId}`);
      }
    }, 500);
  };
  const save = () => {
    if (!canEditDashboard) return;
    const layout: SavedLayout = {
      version: "1.0.0",
      name: "Meridian Default",
      theme,
      widgets: (layouts.lg ?? []).map(({ i, x, y, w, h }) => ({
        i,
        x,
        y,
        w,
        h,
      })),
    };
    saveStoredLayout(layout);
    localStorage.setItem("meridian-layout-json", serializeLayout(layout));
    notify("Dashboard layout saved successfully");
  };

  const saveHistory = () => {
    if (!canEditDashboard) return;
    const name = window.prompt("Enter a name for this layout:");

    if (!name?.trim()) return;

    try {
      const history = saveLayoutSnapshot(name, layouts.lg ?? []);
      setLayoutHistory(history);
      notify("Layout snapshot saved successfully");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to save layout history.",
      );
    }
  };
  const restoreStoredLayout = (name: string) => {
    if (!canEditDashboard) return;
    const saved = getStoredLayout(name);

    if (!saved) {
      notify("Saved layout not found.");
      return;
    }

    try {
      const parsed = deserializeLayout(JSON.stringify(saved));

      if (!isValidLayoutItems(parsed.widgets, 12)) {
        throw new Error("Saved layout positions are invalid.");
      }

      const unknownWidget = parsed.widgets.find(
        (widget) => !widgetMeta[widget.i],
      );

      if (unknownWidget) {
        throw new Error(`Unknown widget: ${unknownWidget.i}`);
      }

      const next: Layout[] = parsed.widgets.map((widget) => ({
        ...widget,
        minW: Math.min(2, widget.w),
        minH: 1,
        maxW: 12,
        maxH: 8,
      }));

      setLayouts({
        ...createResponsiveLayouts(),
        lg: next,
      });

      setTheme(parsed.theme);
      setMenuOpen(false);

      notify(`Restored layout: ${parsed.name}`);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to restore saved layout.",
      );
    }
  };
  const restoreHistory = (snapshot: LayoutSnapshot) => {
    if (!canEditDashboard) return;
    try {
      if (!isValidLayoutItems(snapshot.layout, 12)) {
        throw new Error("This saved layout is invalid.");
      }

      const unknownWidgets = snapshot.layout.filter(
        (widget) => !widgetMeta[widget.i],
      );

      if (unknownWidgets.length > 0) {
        throw new Error(`Unknown widget: ${unknownWidgets[0].i}`);
      }

      setLayouts({
        ...createResponsiveLayouts(),
        lg: snapshot.layout.map((widget) => ({
          ...widget,
          minW: Math.min(2, widget.w),
          minH: 1,
          maxW: 12,
          maxH: 8,
        })),
      });

      setMenuOpen(false);
      notify(`Restored layout: ${snapshot.name}`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to restore layout.",
      );
    }
  };

  const removeHistory = (id: string) => {
    if (!canEditDashboard) return;
    const updatedHistory = deleteLayoutSnapshot(id);
    setLayoutHistory(updatedHistory);
    notify("Layout snapshot deleted");
  };

  const shareLayout = async () => {
    try {
      const shareData: SavedLayout = {
        version: "1.0.0",
        name: "Shared Dashboard",
        theme,
        widgets: (layouts.lg ?? []).map((widget) => ({
          i: widget.i,
          x: widget.x,
          y: widget.y,
          w: widget.w,
          h: widget.h,
        })),
        widgetConfigs: getAllWidgetConfigs(),
      };

      const shareUrl = createShareUrl(
        shareData,
        window.location.href.split("#")[0],
      );

      await navigator.clipboard.writeText(shareUrl);

      notify("Dashboard and widget settings shared successfully!");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to create share link.",
      );
    }
  };
  const exportLayout = () => {
    try {
      const currentLayout = layouts.lg ?? [];

      if (!isValidLayoutItems(currentLayout, 12)) {
        throw new Error("Current dashboard layout is invalid.");
      }

      const unknownWidgets = currentLayout.filter(
        (widget) => !widgetMeta[widget.i],
      );

      if (unknownWidgets.length > 0) {
        throw new Error("Layout contains unknown widgets.");
      }

      const layout = {
        version: "1.0.0",
        name: "My Dashboard",
        theme,
        widgets: layouts.lg.map((widget) => ({
          i: widget.i,
          x: widget.x,
          y: widget.y,
          w: widget.w,
          h: widget.h,
        })),
        widgetConfigs: getAllWidgetConfigs(),
      };

      const json = serializeLayout(layout);

      const blob = new Blob([json], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = "meridian-dashboard-layout.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      notify("Layout JSON exported successfully");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to export dashboard layout.",
      );
    }
  };

  const importLayout = (file?: File) => {
    if (!canEditDashboard) return;
    if (!file) return;

    if (file.size > MAX_LAYOUT_BYTES || file.size === 0) {
      notify(
        file.size === 0
          ? "The selected file is empty."
          : "Layout file exceeds the 50KB size limit.",
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = deserializeLayout(String(reader.result));

        if (!isValidLayoutItems(parsed.widgets, 12)) {
          throw new Error("Invalid dashboard grid positions.");
        }

        const unknownWidgets = parsed.widgets.filter(
          (widget) => !widgetMeta[widget.i],
        );

        if (unknownWidgets.length > 0) {
          throw new Error(`Unknown widget: ${unknownWidgets[0].i}`);
        }

        const next: Layout[] = parsed.widgets.map((widget) => ({
          ...widget,
          minW: Math.min(2, widget.w),
          minH: 1,
          maxW: 12,
          maxH: 8,
        }));
        const importedConfigs = parsed.widgetConfigs ?? {};

        for (const id of Object.keys(importedConfigs)) {
          if (!widgetMeta[id]) {
            throw new Error(`Unknown widget configuration: ${id}`);
          }
        }

        setLayouts({
          ...createResponsiveLayouts(),
          lg: next,
        });

        setTheme(parsed.theme);
        replaceAllWidgetConfigs(importedConfigs);

        setWidgetConfigVersion((version) => version + 1);
        setMenuOpen(false);

        notify("Layout imported and validated successfully");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Invalid layout file.");
      }
    };

    reader.onerror = () => {
      notify("Unable to read the selected layout file.");
    };

    reader.readAsText(file);
  };

  const changeTheme = (t: ThemeName) => {
    if (!canEditDashboard) return;
    setTheme(t);
    setMenuOpen(false);
    notify(
      `${t === "contrast" ? "High contrast" : t[0].toUpperCase() + t.slice(1)} theme enabled`,
    );
  };
  const addAvailable = Object.keys(widgetMeta).filter(
    (id) => !enabledWidgetIds.includes(id),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={19} />
          </div>
          <div>
            <b>MERIDIAN</b>
            <small>CAPITAL PARTNERS</small>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>

        <button
          className={`side-link ${activeSection === "overview" ? "active" : ""}`}
          onClick={() => {
            setActiveSection("overview");
            setSearch("");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <LayoutDashboard size={17} />
          Portfolio Overview
        </button>

        <button
          className={`side-link ${activeSection === "risk" ? "active" : ""}`}
          onClick={() => openWidget("var", "risk")}
        >
          <ShieldCheck size={17} />
          Risk Analytics
        </button>

        <button
          className={`side-link ${activeSection === "holdings" ? "active" : ""}`}
          onClick={() => openWidget("holdings", "holdings")}
        >
          <BriefcaseBusiness size={17} />
          Holdings
        </button>

        <button
          className={`side-link ${activeSection === "alerts" ? "active" : ""}`}
          onClick={() => openWidget("alerts", "alerts")}
        >
          <Bell size={17} />
          Alerts
          <span className="side-count">3</span>
        </button>
        <div className="sidebar-bottom">
          <div className="status-card">
            <span className="status-dot" />
            <div>
              <b>Account secured</b>
              <small>Authenticated session</small>
            </div>
          </div>
          <div className="profile">
            <div className="avatar">
              {user?.user_metadata?.full_name
                ?.split(" ")
                .map((name: string) => name[0])
                .join("")
                .toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>

            <div>
              <b>{user?.user_metadata?.full_name || user?.email}</b>
              <small>{(role ?? "viewer").toUpperCase()} · Portfolio User</small>
            </div>
            <button
              className="icon-btn"
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  notify(
                    error instanceof Error
                      ? error.message
                      : "Unable to sign out",
                  );
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="crumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>Portfolio Overview</strong>
          </div>
          <div className="top-actions">
            <span className="market-status">
              <i /> {streamStatus.toUpperCase()}
            </span>
            <span className="top-divider" />
            <span className="clock">
              <Clock3 size={14} />
              {now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </span>
            <button
              className="top-icon"
              aria-label="Notifications"
              onClick={() => notify("You have 3 active alerts")}
            >
              <Bell size={17} />
              <i />
            </button>
            <div className="avatar small-avatar" title={user?.email}>
              {initials}
            </div>
          </div>
        </header>
        <section className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                INSTITUTIONAL PORTFOLIO INTELLIGENCE
              </div>
              <h1>Portfolio Overview</h1>
              <p>
                {greeting}, {displayName}. Here's what's happening across your
                portfolio today.
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={() => togglePause()}
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}{" "}
                {paused ? "Resume feed" : "Pause feed"}
              </button>
              {canEditDashboard && (
                <button className="button secondary" onClick={() => save()}>
                  <Download size={15} /> Save layout
                </button>
              )}
              {canEditDashboard && (
                <div className="menu-wrap">
                  <button
                    className="button primary"
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <SlidersHorizontal size={15} /> Customise{" "}
                    <ChevronDown size={14} />
                  </button>
                  {menuOpen && (
                    <div className="dropdown">
                      <b>Dashboard settings</b>
                      <label>Appearance</label>
                      <button onClick={() => changeTheme("dark")}>
                        <Moon size={14} /> Dark theme{" "}
                        {theme === "dark" ? "✓" : ""}
                      </button>
                      <button onClick={() => changeTheme("light")}>
                        <Sun size={14} /> Light theme{" "}
                        {theme === "light" ? "✓" : ""}
                      </button>
                      <button onClick={() => changeTheme("contrast")}>
                        <ShieldCheck size={14} /> High contrast{" "}
                        {theme === "contrast" ? "✓" : ""}
                      </button>
                      <label htmlFor="dashboard-accent-color">
                        Accent color
                      </label>

                      <div className="accent-color-control">
                        <input
                          id="dashboard-accent-color"
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          aria-label="Choose dashboard accent color"
                        />

                        <span>{accentColor.toUpperCase()}</span>
                      </div>
                      <hr />
                      <label>Layout</label>

                      <button onClick={saveHistory}>
                        <Download size={14} /> Save layout snapshot
                      </button>
                      <label>
                        Saved dashboard layouts ({savedLayouts.length})
                      </label>

                      {savedLayouts.length === 0 ? (
                        <small className="history-empty">
                          No saved dashboard layouts.
                        </small>
                      ) : (
                        <div className="layout-history-list">
                          {savedLayouts.map((layout) => (
                            <div
                              className="layout-history-item"
                              key={layout.name}
                            >
                              <div>
                                <b>{layout.name}</b>
                                <small>{layout.widgets.length} widgets</small>
                              </div>

                              <button
                                title={`Restore ${layout.name}`}
                                aria-label={`Restore ${layout.name}`}
                                onClick={() => restoreStoredLayout(layout.name)}
                              >
                                <RefreshCw size={14} />
                              </button>

                              <button
                                title={`Delete ${layout.name}`}
                                aria-label={`Delete ${layout.name}`}
                                onClick={() => {
                                  deleteStoredLayout(layout.name);
                                  notify("Saved layout deleted.");
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label>
                        Saved layout history ({layoutHistory.length}/10)
                      </label>

                      {layoutHistory.length === 0 ? (
                        <small className="history-empty">
                          No saved layouts yet.
                        </small>
                      ) : (
                        <div className="layout-history-list">
                          {layoutHistory.map((snapshot) => (
                            <div
                              className="layout-history-item"
                              key={snapshot.id}
                            >
                              <div>
                                <b>{snapshot.name}</b>
                                <small>
                                  {new Date(snapshot.createdAt).toLocaleString(
                                    "en-IN",
                                  )}
                                </small>
                              </div>

                              <button
                                title={`Restore ${snapshot.name}`}
                                aria-label={`Restore ${snapshot.name}`}
                                onClick={() => restoreHistory(snapshot)}
                              >
                                <RefreshCw size={14} />
                              </button>

                              <button
                                title={`Delete ${snapshot.name}`}
                                aria-label={`Delete ${snapshot.name}`}
                                onClick={() => removeHistory(snapshot.id)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button onClick={shareLayout}>
                        <Share2 size={14} />
                        Share dashboard
                      </button>
                      <label className="file-label">
                        <Upload size={14} /> Import layout JSON
                        <input
                          type="file"
                          accept="application/json,.json"
                          onChange={(e) => {
                            const file = e.currentTarget.files?.[0];
                            importLayout(file);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>

                      <button
                        onClick={() => {
                          reset();
                          resetTheme();
                          resetAllWidgetSettings();
                          resetLayouts();

                          replaceAllWidgetConfigs({});

                          setLayouts(createResponsiveLayouts());
                          setWidgetConfigVersion((version) => version + 1);
                          setWidgetRefreshKeys({});
                          setMenuOpen(false);

                          notify("All dashboard settings reset to defaults.");
                        }}
                      >
                        <RefreshCw size={14} /> Reset dashboard
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="summary-grid">
            <div className="summary-card main-metric">
              <div className="metric-top">
                <span>Total assets under management</span>
                <span className="metric-icon">
                  <BriefcaseBusiness size={17} />
                </span>
              </div>
              <strong>{currency(metrics.aum)}</strong>
              <div className="metric-bottom">
                <span className="positive">
                  <ArrowUpRight size={14} /> +2.4%
                </span>
                <small>vs previous quarter</small>
              </div>
            </div>
            <div className="summary-card">
              <div className="metric-top">
                <span>Daily P&L</span>
                <span className="metric-icon green">
                  <Activity size={17} />
                </span>
              </div>
              <strong className={metrics.dailyPnL >= 0 ? "positive" : ""}>
                {formatPnL(metrics.dailyPnL)}
              </strong>
              <div className="metric-bottom">
                <span className="positive">
                  <ArrowUpRight size={14} /> +{metrics.dailyPnLPercent}%
                </span>
                <small>vs previous close</small>
              </div>
            </div>
            <div className="summary-card">
              <div className="metric-top">
                <span>MTD return</span>
                <span className="metric-icon purple">
                  <Activity size={17} />
                </span>
              </div>
              <strong className="positive">+{metrics.mtdReturn}%</strong>
              <div className="metric-bottom">
                <span className="positive">
                  <ArrowUpRight size={14} /> +0.42%
                </span>
                <small>month to date</small>
              </div>
            </div>
            <div className="summary-card">
              <div className="metric-top">
                <span>YTD return</span>
                <span className="metric-icon amber">
                  <Activity size={17} />
                </span>
              </div>
              <strong className="positive">+{metrics.ytdReturn}%</strong>
              <div className="metric-bottom">
                <span className="positive">
                  <ArrowUpRight size={14} /> +1.18%
                </span>
                <small>year to date</small>
              </div>
            </div>
            <div className="summary-card">
              <div className="metric-top">
                <span>Sharpe ratio</span>
                <span className="metric-icon blue">
                  <ShieldCheck size={17} />
                </span>
              </div>
              <strong>{metrics.sharpeRatio.toFixed(2)}</strong>
              <div className="metric-bottom">
                <span className="quality-pill">GOOD</span>
                <small>risk-adjusted return</small>
              </div>
            </div>
          </div>
          <div className="section-toolbar">
            <div className="section-title">
              <h2>Analytics workspace</h2>
              <span className="live-badge">
                <i /> SIMULATED FEED
              </span>
            </div>
            <div className="workspace-tools">
              <div className="search-box">
                <Search size={14} />
                <input
                  aria-label="Search widgets"
                  placeholder="Find a widget..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {permissions.canManageWidgets && (
                <select
                  aria-label="Add widget"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;

                    if (!id) return;

                    if (activeWidgets.includes(id)) {
                      toggleWidget(id);
                      notify(`${widgetMeta[id].title} enabled`);
                    } else {
                      addWidget(id);
                      notify(`${widgetMeta[id].title} added`);
                    }

                    e.currentTarget.value = "";
                  }}
                >
                  <option value="">+ Add widget</option>
                  {addAvailable.map((id) => (
                    <option value={id} key={id}>
                      {activeWidgets.includes(id)
                        ? `Enable: ${widgetMeta[id].title}`
                        : `Add: ${widgetMeta[id].title}`}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="tool-icon"
                aria-label="Compact layout"
                onClick={() => setCompact((v) => !v)}
              >
                <Expand size={15} />
              </button>
            </div>
          </div>

          {portfolioLoading && (
            <div className="data-note" role="status">
              <span>Loading portfolio data...</span>
            </div>
          )}

          {portfolioError && (
            <div className="data-note" role="alert">
              <span>
                Portfolio API error:{" "}
                {portfolioErrorMessage instanceof Error
                  ? portfolioErrorMessage.message
                  : "Unable to load portfolio data."}
              </span>

              <button
                className="button secondary"
                onClick={() => refetchPortfolio()}
                disabled={portfolioFetching}
              >
                <RefreshCw size={14} />
                {portfolioFetching ? "Retrying..." : "Retry"}
              </button>
            </div>
          )}

          <div className="data-note">
            <span>
              <i /> DEMO MODE — All portfolio values and market data are
              simulated.
            </span>
            <span>
              Last sync:{" "}
              {new Date(metrics.lastUpdated).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}{" "}
              · Auto-refresh 10s
            </span>
          </div>
          <div className="dashboard-grid">
            <ResponsiveGrid
              className="layout"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
              cols={{ lg: 12, md: 8, sm: 4, xs: 2 }}
              rowHeight={compact ? 48 : 58}
              margin={[12, 12]}
              containerPadding={[0, 0]}
              onLayoutChange={(_, all) => setLayouts(all)}
              draggableHandle=".widget-drag"
              draggableCancel="button, input, select, textarea, a"
              resizeHandles={["se", "sw", "ne", "nw", "n", "s", "e", "w"]}
              isDraggable={canEditDashboard}
              isResizable={canEditDashboard}
              isBounded
              compactType={null}
              preventCollision={false}
            >
              {shownWidgets.map((id) => {
                const meta = widgetMeta[id];
                return (
                  <div
                    id={`widget-${id}`}
                    key={id}
                    className={`widget-card ${id === "ticker" ? "ticker-card" : ""}`}
                  >
                    <div className="widget-header">
                      <div className="widget-heading">
                        {canEditDashboard && (
                          <span
                            className="widget-drag"
                            aria-label={`Drag ${getWidgetConfig(id).title || meta.title}`}
                          >
                            <Menu size={14} />
                          </span>
                        )}
                        <div>
                          <h3>
                            {widgetSettings[id]?.title?.trim() || meta.title}
                          </h3>
                          <small>{meta.subtitle}</small>
                        </div>
                      </div>
                      {canConfigureWidgets && (
                        <button
                          aria-label={`Reset ${meta.title} settings`}
                          className="widget-action"
                          title="Reset widget settings"
                          onClick={() => resetWidgetConfiguration(id)}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <div className="widget-actions">
                        <button
                          aria-label={`Refresh ${meta.title}`}
                          className="widget-action"
                          title="Refresh widget"
                          onClick={() => refreshWidget(id)}
                        >
                          <RefreshCw size={14} />
                        </button>
                        {canConfigureWidgets && (
                          <button
                            aria-label={`Configure ${meta.title}`}
                            className="widget-action"
                            title="Configure widget"
                            onClick={() => configureWidget(id)}
                          >
                            <Settings2 size={14} />
                          </button>
                        )}

                        <span className="fresh-dot" title="Demo data" />
                        {permissions.canManageWidgets && (
                          <button
                            aria-label={`Disable ${meta.title}`}
                            title="Disable widget"
                            className="widget-action"
                            onClick={() => {
                              toggleWidget(id);
                              notify(`${meta.title} disabled`);
                            }}
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="widget-body">
                      <WidgetErrorBoundary
                        key={`${id}-${widgetRefreshKeys[id] ?? 0}`}
                        title={meta.title}
                      >
                        <WidgetContent
                          id={id}
                          refreshKey={widgetRefreshKeys[id] ?? 0}
                        />
                      </WidgetErrorBoundary>
                    </div>
                  </div>
                );
              })}
            </ResponsiveGrid>
            {shownWidgets.length === 0 && (
              <div className="no-widgets">
                No widgets match your search. Try another keyword.
              </div>
            )}
          </div>
          <footer>
            <span>MERIDIAN CAPITAL PARTNERS · INTERNAL USE ONLY</span>
            <span>Data is simulated for demonstration purposes · v1.0.0</span>
          </footer>
        </section>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Loading Meridian Capital...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DashboardApp />;
}
