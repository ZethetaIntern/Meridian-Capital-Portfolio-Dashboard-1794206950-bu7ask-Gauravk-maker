import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWidgetStore } from "../store/widgetStore";

export type WidgetDataStatus = "loading" | "success" | "error" | "stale";

interface UseWidgetDataOptions<T> {
  widgetId: string;
  queryFn: () => Promise<T>;
  refreshMs?: number;
  enabled?: boolean;
}

export function useWidgetData<T>({
  widgetId,
  queryFn,
  refreshMs = 30_000,
  enabled = true,
}: UseWidgetDataOptions<T>) {
  const storedRefreshMs = useWidgetStore(
    (state) => state.widgetSettings[widgetId]?.refreshInterval,
  );

  const storedEnabled = useWidgetStore(
    (state) => state.widgetSettings[widgetId]?.enabled,
  );

  const isWidgetEnabled = enabled && (storedEnabled ?? true);

  const safeRefreshMs = Math.max(
    1_000,
    storedRefreshMs ?? refreshMs,
  );

  const query = useQuery<T, Error>({
    queryKey: ["widget-data", widgetId],
    queryFn,
    enabled: isWidgetEnabled,
    refetchInterval: isWidgetEnabled ? safeRefreshMs : false,
    staleTime: safeRefreshMs,
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const [isStaleData, setIsStaleData] = useState(false);

  useEffect(() => {
    if (!isWidgetEnabled || !query.data || !query.dataUpdatedAt) {
      setIsStaleData(false);
      return;
    }

    setIsStaleData(false);

    const staleAfterMs = query.dataUpdatedAt + safeRefreshMs * 2 - Date.now();

    if (staleAfterMs <= 0) {
      setIsStaleData(true);
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsStaleData(true);
    }, staleAfterMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isWidgetEnabled, query.data, query.dataUpdatedAt, safeRefreshMs]);

  const status: WidgetDataStatus = query.isPending
    ? "loading"
    : isStaleData
      ? "stale"
      : query.isError
        ? "error"
        : "success";

  return {
    ...query,
    status,
    isStaleData,
    isRefreshing: query.isFetching && !query.isPending,
    refresh: query.refetch,
  };
}
