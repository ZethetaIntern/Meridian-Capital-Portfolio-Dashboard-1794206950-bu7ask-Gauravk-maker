import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

const mocks = vi.hoisted(() => ({
  query: {
    data: undefined as any,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
    isFetching: false,
  },
  auth: {
    user: null as any,
    role: "admin" as "admin" | "analyst" | "viewer",
    loading: false,
    signOut: vi.fn(),
  },
  store: {
    theme: "dark" as string,
    setTheme: vi.fn(),
    activeWidgets: ["performance", "holdings", "alerts"],
    addWidget: vi.fn(),
    removeWidget: vi.fn(),
    paused: false,
    togglePause: vi.fn(),
    reset: vi.fn(),
  },
  widgetStore: {
    widgetSettings: {},
    toggleWidget: vi.fn(),
    updateWidgetSettings: vi.fn(),
    resetWidgetSettings: vi.fn(),
    resetAllWidgetSettings: vi.fn(),
  },
}));
vi.mock("../store/widgetStore", () => ({
  useWidgetStore: () => mocks.widgetStore,
}));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mocks.query,
}));
vi.mock("../store/dashboardStore", () => ({
  useDashboardStore: () => mocks.store,
}));
vi.mock("../hooks/useLiveClock", () => ({
  useLiveClock: () => new Date("2026-01-02T03:04:05.000Z"),
}));
vi.mock("../hooks/useMarketStream", () => ({
  useMarketStream: () => "connected",
}));
vi.mock("../pages/AuthPage", () => ({
  default: () => <div>Mock Auth Page</div>,
}));
vi.mock("../components/WidgetErrorBoundary", () => ({
  WidgetErrorBoundary: ({ children }: any) => <>{children}</>,
}));
vi.mock("../widgets/WidgetContent", () => ({
  widgetMeta: {
    performance: { title: "Performance", subtitle: "Returns and performance" },
    holdings: { title: "Holdings", subtitle: "Portfolio holdings" },
    alerts: { title: "Alerts", subtitle: "Active alerts" },
    var: { title: "Risk Analytics", subtitle: "Risk metrics" },
    allocation: { title: "Allocation", subtitle: "Asset allocation" },
  },
  WidgetContent: ({ id }: any) => <div>Widget content: {id}</div>,
}));
vi.mock("react-grid-layout", () => ({
  Responsive: ({ children }: any) => <div>{children}</div>,
  WidthProvider: (Component: any) => Component,
}));

describe("App root and dashboard interactions", () => {
  beforeEach(() => {
    mocks.auth.user = null;
    mocks.auth.role = "admin";
    mocks.auth.loading = false;
    mocks.auth.signOut.mockReset();
    mocks.store.theme = "dark";
    mocks.store.activeWidgets = ["performance", "holdings", "alerts"];
    mocks.store.paused = false;
    mocks.widgetStore.widgetSettings = {};
    mocks.widgetStore.toggleWidget.mockReset();
    mocks.query.data = undefined;
    mocks.query.isLoading = false;
    mocks.query.isError = false;
    mocks.query.error = null;
    mocks.query.isFetching = false;
    mocks.query.refetch.mockReset();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows loading state while authentication is being checked", () => {
    mocks.auth.loading = true;
    render(<App />);
    expect(screen.getByText("Loading Meridian Capital...")).toBeInTheDocument();
  });

  it("renders AuthPage when there is no authenticated user", () => {
    render(<App />);
    expect(screen.getByText("Mock Auth Page")).toBeInTheDocument();
  });

  it("renders dashboard identity, metrics, and widgets for a signed-in user", () => {
    mocks.auth.user = {
      email: "alex@example.com",
      user_metadata: { full_name: "Alex Morgan" },
    };
    render(<App />);
    expect(screen.getByText("MERIDIAN")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Portfolio Overview/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Alex Morgan", { selector: "b" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$45.00B")).toBeInTheDocument();
    expect(screen.getByText("Widget content: performance")).toBeInTheDocument();
    expect(screen.getByText("Widget content: holdings")).toBeInTheDocument();
    expect(screen.getByText("CONNECTED")).toBeInTheDocument();
  });

  it("filters widgets and shows empty state for no matches", () => {
    mocks.auth.user = { email: "alex@example.com", user_metadata: {} };
    render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search widgets" }), {
      target: { value: "not-a-widget" },
    });
    expect(
      screen.getByText("No widgets match your search. Try another keyword."),
    ).toBeInTheDocument();
  });

  
  it("supports pause, notification, and theme menu actions", async () => {
    mocks.auth.user = { email: "alex@example.com", user_metadata: {} };
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: /Pause feed/i })[0]);
    expect(mocks.store.togglePause).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "You have 3 active alerts",
    );

    fireEvent.click(screen.getByRole("button", { name: /Customise/ }));
    fireEvent.click(screen.getByRole("button", { name: /Light theme/ }));
    expect(mocks.store.setTheme).toHaveBeenCalledWith("light");
  });

  it("resets all dashboard settings from the customise menu", () => {
    mocks.auth.user = { email: "alex@example.com", user_metadata: {} };

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Customise/ }));
    fireEvent.click(screen.getByRole("button", { name: /Reset dashboard/ }));

    expect(mocks.store.reset).toHaveBeenCalled();
    expect(mocks.widgetStore.resetAllWidgetSettings).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "All dashboard settings reset to defaults.",
    );
  });


  it("calls disable/add widget actions and navigates to sidebar sections", () => {
    mocks.auth.user = { email: "alex@example.com", user_metadata: {} };

    render(<App />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Disable Performance" })[0],
    );

    expect(mocks.widgetStore.toggleWidget).toHaveBeenCalledWith("performance");

    fireEvent.change(screen.getByRole("combobox", { name: "Add widget" }), {
      target: { value: "allocation" },
    });

    expect(mocks.store.addWidget).toHaveBeenCalledWith("allocation");

    fireEvent.click(screen.getByRole("button", { name: "Risk Analytics" }));

    expect(mocks.store.addWidget).toHaveBeenCalledWith("var");
  });
  it("saves layout and handles sign-out errors", async () => {
    mocks.auth.user = { email: "alex@example.com", user_metadata: {} };
    mocks.auth.signOut.mockRejectedValueOnce(new Error("Sign-out unavailable"));
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: "Save layout" })[0]);
    expect(localStorage.getItem("meridian-layout-json")).toContain(
      "Meridian Default",
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Sign-out unavailable",
      );
    });
  });

  it("saves widget configuration with a valid title and refresh interval", async () => {
    mocks.auth.user = {
      email: "alex@example.com",
      user_metadata: {},
    };

    const promptSpy = vi
      .spyOn(window, "prompt")
      .mockReturnValueOnce("My Performance")
      .mockReturnValueOnce("5000");

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Configure Performance" }),
    );

    await waitFor(() => {
      expect(mocks.widgetStore.updateWidgetSettings).toHaveBeenCalledWith(
        "performance",
        {
          title: "My Performance",
          refreshInterval: 5000,
          enabled: true,
        },
      );
    });

    expect(promptSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent(
      "settings saved. Refresh: 5s",
    );

    promptSpy.mockRestore();
  });

  it("does not save widget configuration when title is empty", () => {
    mocks.auth.user = {
      email: "alex@example.com",
      user_metadata: {},
    };

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValueOnce("   ");

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Configure Performance" }),
    );

    expect(mocks.widgetStore.updateWidgetSettings).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Widget title cannot be empty.",
    );

    promptSpy.mockRestore();
  });

  it("rejects an invalid widget refresh interval", () => {
    mocks.auth.user = {
      email: "alex@example.com",
      user_metadata: {},
    };

    const promptSpy = vi
      .spyOn(window, "prompt")
      .mockReturnValueOnce("Performance")
      .mockReturnValueOnce("500");

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Configure Performance" }),
    );

    expect(mocks.widgetStore.updateWidgetSettings).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Refresh interval must be between 1000 and 300000 ms.",
    );

    promptSpy.mockRestore();
  });

  it("hides editing controls for viewer role", () => {
    mocks.auth.user = {
      email: "viewer@example.com",
      user_metadata: {},
    };
    mocks.auth.role = "viewer";

    render(<App />);

    expect(
      screen.queryByRole("button", { name: "Save layout" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /Customise/ }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Configure Performance" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Disable Performance" }),
    ).not.toBeInTheDocument();
  });
  it("shows portfolio loading status", () => {
    mocks.auth.user = { email: "alex@example.com" };
    mocks.query.isLoading = true;

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading portfolio data...",
    );
  });

  it("shows portfolio API error with the actual error message", () => {
    mocks.auth.user = { email: "alex@example.com" };
    mocks.query.isError = true;
    mocks.query.error = new Error("Portfolio server unavailable");

    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Portfolio API error: Portfolio server unavailable",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows fallback message when portfolio error is not an Error instance", () => {
    mocks.auth.user = { email: "alex@example.com" };
    mocks.query.isError = true;
    mocks.query.error = "Unknown API failure" as any;

    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load portfolio data.",
    );
  });

  it("calls portfolio refetch when Retry is clicked", () => {
    mocks.auth.user = { email: "alex@example.com" };
    mocks.query.isError = true;

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(mocks.query.refetch).toHaveBeenCalledTimes(1);
  });

  it("disables retry button and shows Retrying while fetching", () => {
    mocks.auth.user = { email: "alex@example.com" };
    mocks.query.isError = true;
    mocks.query.isFetching = true;

    render(<App />);

    const retryButton = screen.getByRole("button", {
      name: "Retrying...",
    });

    expect(retryButton).toBeDisabled();
  });

  it("shows Enable option and enables a disabled widget", () => {
    mocks.auth.user = { email: "alex@example.com" };
    mocks.widgetStore.widgetSettings = {
      performance: { enabled: false },
    };

    render(<App />);

    const dropdown = screen.getByLabelText("Add widget");

    expect(
      screen.getByRole("option", { name: "Enable: Performance" }),
    ).toBeInTheDocument();

    fireEvent.change(dropdown, {
      target: { value: "performance" },
    });

    expect(mocks.widgetStore.toggleWidget).toHaveBeenCalledWith("performance");
    expect(screen.getByText("Performance enabled")).toBeInTheDocument();
  });

  it("adds a widget that is not currently active", () => {
    mocks.auth.user = { email: "alex@example.com" };

    render(<App />);

    const dropdown = screen.getByLabelText("Add widget");

    expect(
      screen.getByRole("option", { name: "Add: Risk Analytics" }),
    ).toBeInTheDocument();

    fireEvent.change(dropdown, {
      target: { value: "var" },
    });

    expect(mocks.store.addWidget).toHaveBeenCalledWith("var");
    expect(screen.getByText("Risk Analytics added")).toBeInTheDocument();
  });

  it("does nothing when the Add widget dropdown is reset to its empty value", () => {
    mocks.auth.user = { email: "alex@example.com" };

    render(<App />);

    fireEvent.change(screen.getByLabelText("Add widget"), {
      target: { value: "" },
    });

    expect(mocks.store.addWidget).not.toHaveBeenCalled();
    expect(mocks.widgetStore.toggleWidget).not.toHaveBeenCalled();
  });
});
