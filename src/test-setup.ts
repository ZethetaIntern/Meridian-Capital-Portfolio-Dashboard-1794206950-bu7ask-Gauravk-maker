
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, vi } from "vitest";
import { createElement } from "react";

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

beforeEach(() => {
  queryClient.clear();
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  localStorage.clear();
  sessionStorage.clear();
});

vi.mock("@testing-library/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@testing-library/react")>();

  return {
    ...actual,
    render: (ui: Parameters<typeof actual.render>[0], options?: Parameters<typeof actual.render>[1]) =>
      actual.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          ui,
        ),
        options,
      ),
  };
});
