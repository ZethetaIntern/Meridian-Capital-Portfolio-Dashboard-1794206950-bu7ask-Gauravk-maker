import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  useWidgetData: vi.fn(),
}));

vi.mock("../hooks/useWidgetData", () => ({
  useWidgetData: mocks.useWidgetData,
}));

import { WidgetContent } from "../widgets/WidgetContent";
import { eventBus } from "../data/eventBus";

const sampleRiskData = {
  drawdown: [
    { day: "Day 1", drawdown: -1.25 },
    { day: "Day 2", drawdown: -3.5 },
  ],
  maxDrawdown: -3.5,
};

function setupWidget(overrides: Record<string, unknown> = {}) {
  const refresh = vi.fn();

  mocks.useWidgetData.mockReturnValue({
    data: sampleRiskData,
    isLoading: false,
    isError: false,
    error: null,
    refresh,
    isRefreshing: false,
    status: "success",
    ...overrides,
  });

  render(<WidgetContent id="drawdown" />);

  return { refresh };
}

describe("Drawdown widget states", () => {
  beforeEach(() => {
    mocks.useWidgetData.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading state", () => {
    setupWidget({
      data: undefined,
      isLoading: true,
      status: "loading",
    });

    expect(screen.getByText("Loading drawdown data...")).toBeInTheDocument();
  });

  it("shows stale data status", () => {
    setupWidget({
      status: "stale",
    });

    expect(screen.getByText("Showing stale drawdown data")).toBeInTheDocument();
  });

  it("shows refreshing status", () => {
    setupWidget({
      isRefreshing: true,
    });

    expect(screen.getByText("Updating drawdown data...")).toBeInTheDocument();
  });

  it("shows API error message", () => {
    setupWidget({
      isError: true,
      error: new Error("Risk API unavailable"),
      status: "error",
    });

    expect(
      screen.getByText("API error: Risk API unavailable"),
    ).toBeInTheDocument();
  });

  it("shows fallback API error when error is missing", () => {
    setupWidget({
      isError: true,
      error: null,
      status: "error",
    });

    expect(
      screen.getByText(/API error: Unable to load drawdown data/),
    ).toBeInTheDocument();
  });

  it("calls refresh when Retry is clicked", () => {
    const { refresh } = setupWidget({
      isError: true,
      error: new Error("Risk API unavailable"),
      status: "error",
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("disables Retry while refreshing", () => {
    setupWidget({
      isError: true,
      error: new Error("Risk API unavailable"),
      isRefreshing: true,
      status: "error",
    });

    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
  });

  it("renders maximum drawdown and historical values", () => {
    setupWidget();

    expect(
      screen.getByRole("img", {
        name: "Historical portfolio drawdown. Maximum drawdown: -3.50%.",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/Day 1: -1.25%/)).toBeInTheDocument();
    expect(screen.getByText(/Day 2: -3.50%/)).toBeInTheDocument();
  });

  it("updates live drawdown data when a price tick arrives", () => {
    setupWidget({
      data: {
        drawdown: [],
        maxDrawdown: undefined,
      },
    });

    act(() => {
      eventBus.emit("PRICE_TICK", {
        ticker: "RELIANCE",
        price: 1500,
        changePct: -5,
        timestamp: Date.now(),
        sequence: 1,
      });
    });

    expect(screen.getByText(/LIVE:/)).toBeInTheDocument();
  });
});
