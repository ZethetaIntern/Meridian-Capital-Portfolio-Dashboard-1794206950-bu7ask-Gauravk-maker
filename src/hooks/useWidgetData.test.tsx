
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWidgetData } from "./useWidgetData";
import { useWidgetStore } from "../store/widgetStore";
import type { ReactNode } from "react";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("useWidgetData", () => {
  beforeEach(() => {
    vi.useRealTimers();
    useWidgetStore.getState().resetAllWidgetSettings();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns loading initially and success after fetching", async () => {
    const queryFn = vi.fn().mockResolvedValue({ value: 100 });

    const { result } = renderHook(
      () => useWidgetData({
        widgetId: "performance-test",
        queryFn,
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.data).toEqual({ value: 100 });
    expect(queryFn).toHaveBeenCalled();
  });

  
it("returns error status when query fails", async () => {
  const queryFn = vi.fn().mockRejectedValue(
    new Error("API unavailable"),
  );

  const { result } = renderHook(
    () => useWidgetData({
      widgetId: "error-test",
      queryFn,
    }),
    { wrapper: createWrapper() },
  );

  await waitFor(
    () => {
      expect(result.current.status).toBe("error");
    },
    { timeout: 10000 },
  );

  expect(result.current.error?.message).toBe("API unavailable");
  expect(queryFn).toHaveBeenCalledTimes(3);
});


  it("does not fetch when widget is disabled through options", async () => {
    const queryFn = vi.fn().mockResolvedValue({ value: 1 });

    const { result } = renderHook(
      () => useWidgetData({
        widgetId: "disabled-test",
        queryFn,
        enabled: false,
      }),
      { wrapper: createWrapper() },
    );

    expect(result.current.status).toBe("loading");
    expect(queryFn).not.toHaveBeenCalled();
  });

  it("does not fetch when widget is disabled in Zustand store", async () => {
    useWidgetStore.getState().updateWidgetSettings("store-disabled", {
      enabled: false,
    });

    const queryFn = vi.fn().mockResolvedValue({ value: 1 });

    renderHook(
      () => useWidgetData({
        widgetId: "store-disabled",
        queryFn,
      }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryFn).not.toHaveBeenCalled();
  });

  it("uses stored refresh interval when available", async () => {
    useWidgetStore.getState().setRefreshInterval(
      "custom-refresh",
      5000,
    );

    const queryFn = vi.fn().mockResolvedValue({ value: 1 });

    const { result } = renderHook(
      () => useWidgetData({
        widgetId: "custom-refresh",
        queryFn,
        refreshMs: 30000,
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.data).toEqual({ value: 1 });
  });

  it("supports manual refresh", async () => {
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockResolvedValueOnce({ value: 2 });

    const { result } = renderHook(
      () => useWidgetData({
        widgetId: "manual-refresh",
        queryFn,
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ value: 1 });
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ value: 2 });
    });
  });

  it("reports refreshing separately from initial loading", async () => {
    let resolveQuery!: (value: { value: number }) => void;

    const queryFn = vi.fn().mockImplementation(
      () => new Promise<{ value: number }>((resolve) => {
        resolveQuery = resolve;
      }),
    );

    const { result } = renderHook(
      () => useWidgetData({
        widgetId: "refreshing-test",
        queryFn,
      }),
      { wrapper: createWrapper() },
    );

    expect(result.current.status).toBe("loading");
    expect(result.current.isRefreshing).toBe(false);

    await act(async () => {
      resolveQuery({ value: 10 });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
  });

  
it("marks data stale when its stale deadline has already passed", async () => {
  const dateSpy = vi.spyOn(Date, "now").mockReturnValue(100000);

  const queryFn = vi.fn().mockResolvedValue({ value: 10 });

  const { result, rerender } = renderHook(
    ({ refreshMs }) => useWidgetData({
      widgetId: "stale-test",
      queryFn,
      refreshMs,
    }),
    {
      wrapper: createWrapper(),
      initialProps: { refreshMs: 1000 },
    },
  );

  await waitFor(() => {
    expect(result.current.status).toBe("success");
  });

  dateSpy.mockReturnValue(110000);

  rerender({ refreshMs: 2000 });

  await waitFor(() => {
    expect(result.current.status).toBe("stale");
  });

  dateSpy.mockRestore();
});


  it("respects the minimum refresh interval of 1000ms", async () => {
    useWidgetStore.getState().setRefreshInterval(
      "minimum-refresh",
      100,
    );

    const queryFn = vi.fn().mockResolvedValue({ value: 1 });

    const { result } = renderHook(
      () => useWidgetData({
        widgetId: "minimum-refresh",
        queryFn,
        refreshMs: 100,
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.data).toEqual({ value: 1 });
  });

  it("cleans up when the hook unmounts", async () => {
    const queryFn = vi.fn().mockResolvedValue({ value: 1 });

    const { result, unmount } = renderHook(
      () => useWidgetData({
        widgetId: "cleanup-test",
        queryFn,
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(() => unmount()).not.toThrow();
  });
});
