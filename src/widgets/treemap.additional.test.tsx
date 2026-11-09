
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WidgetContent } from "./WidgetContent";

const mocks = vi.hoisted(() => ({
  widgetData: {
    data: undefined as any,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refresh: vi.fn(),
    isRefreshing: false,
    status: "fresh" as string,
  },
}));

vi.mock("../hooks/useWidgetData", () => ({
  useWidgetData: () => mocks.widgetData,
}));

describe("Treemap widget additional coverage", () => {
  beforeEach(() => {
    mocks.widgetData.data = undefined;
    mocks.widgetData.isLoading = false;
    mocks.widgetData.isError = false;
    mocks.widgetData.error = null;
    mocks.widgetData.isRefreshing = false;
    mocks.widgetData.status = "fresh";
    mocks.widgetData.refresh.mockReset();
  });

  it("shows loading allocation status", () => {
    mocks.widgetData.isLoading = true;

    render(<WidgetContent id="treemap" />);

    expect(screen.getByText("Loading allocation data...")).toBeInTheDocument();
  });

  it("shows stale allocation status", () => {
    mocks.widgetData.status = "stale";

    render(<WidgetContent id="treemap" />);

    expect(screen.getByText("Showing stale allocation data")).toBeInTheDocument();
  });

  it("shows updating status while refreshing", () => {
    mocks.widgetData.isRefreshing = true;

    render(<WidgetContent id="treemap" />);

    expect(screen.getByText("Updating allocation...")).toBeInTheDocument();
  });

  it("shows API error message", () => {
    mocks.widgetData.isError = true;
    mocks.widgetData.error = new Error("Allocation API unavailable");

    render(<WidgetContent id="treemap" />);

    expect(screen.getByText(/API error: Allocation API unavailable/)).toBeInTheDocument();
  });

  it("shows fallback message when error is missing", () => {
    mocks.widgetData.isError = true;
    mocks.widgetData.error = null;

    render(<WidgetContent id="treemap" />);

    expect(screen.getByText(/Unable to load allocation/)).toBeInTheDocument();
  });

  it("calls refresh when Retry is clicked", () => {
    mocks.widgetData.isError = true;

    render(<WidgetContent id="treemap" />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(mocks.widgetData.refresh).toHaveBeenCalledTimes(1);
  });

  it("disables Retry while refreshing", () => {
    mocks.widgetData.isError = true;
    mocks.widgetData.isRefreshing = true;

    render(<WidgetContent id="treemap" />);

    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
  });

  it("renders allocation data from the API", () => {
    mocks.widgetData.data = {
      allocation: [
        { name: "Test Equity", value: 60, color: "#123456" },
        { name: "Test Bonds", value: 40, color: "#654321" },
      ],
    };

    render(<WidgetContent id="treemap" />);

    expect(screen.getByText("Test Equity")).toBeInTheDocument();
    expect(screen.getByText("Test Bonds")).toBeInTheDocument();
    expect(screen.getByText("60.0% of allocation")).toBeInTheDocument();
    expect(screen.getByText("40.0% of allocation")).toBeInTheDocument();
  });

  it("handles zero total allocation without division errors", () => {
    mocks.widgetData.data = {
      allocation: [
        { name: "Zero Equity", value: 0, color: "#123456" },
        { name: "Zero Bonds", value: 0, color: "#654321" },
      ],
    };

    render(<WidgetContent id="treemap" />);

    expect(screen.getAllByText("0.0% of allocation")).toHaveLength(2);
    expect(screen.getAllByText("0%")).toHaveLength(2);
  });
});
