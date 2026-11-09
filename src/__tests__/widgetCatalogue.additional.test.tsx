import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import { WidgetContent, widgetMeta } from "../widgets/WidgetContent";
import { eventBus } from "../data/eventBus";

afterEach(() => {
  cleanup();
});

describe("all dashboard widgets render", () => {
  it.each(Object.keys(widgetMeta))("renders widget: %s", (id) => {
    const { container } = render(<WidgetContent id={id} />);

    // The widget should render a root element.
    expect(container.firstChild).not.toBeNull();

    const widget = container.firstElementChild;

    expect(widget).toBeInTheDocument();

    // Some widgets render text; chart widgets may render SVG graphics.
    const hasText = Boolean(widget?.textContent?.trim());
    const hasRenderedElements = Boolean(widget?.children.length);
    const hasSvg = Boolean(widget?.querySelector("svg"));

    expect(hasText || hasRenderedElements || hasSvg).toBe(true);
  });
});

describe("widget interactions", () => {
  it("filters holdings by ticker/company and supports clearing the query", () => {
    render(<WidgetContent id="holdings" />);

    const search = screen.getByRole("textbox", {
      name: "Search holdings",
    });

    fireEvent.change(search, {
      target: { value: "RELIANCE" },
    });

    expect(screen.getByText("RELIANCE")).toBeInTheDocument();
    expect(screen.queryByText("HDFCBANK")).not.toBeInTheDocument();

    fireEvent.change(search, {
      target: { value: "" },
    });

    expect(screen.getByText("HDFCBANK")).toBeInTheDocument();
  });

  it("switches holdings sort mode", () => {
    render(<WidgetContent id="holdings" />);

    const button = screen.getByRole("button", {
      name: "Sort: Value",
    });

    fireEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Sort: P&L" }),
    ).toBeInTheDocument();
  });

  it("emits selected symbol when a holding row is clicked", () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.on("SYMBOL_SELECTED", handler);

    render(<WidgetContent id="holdings" />);

    fireEvent.click(screen.getByText("RELIANCE"));

    expect(handler).toHaveBeenCalledWith({
      symbol: "RELIANCE",
    });

    unsubscribe();
  });

  it("dismisses an alert", () => {
    render(<WidgetContent id="alerts" />);

    expect(
      screen.getByText(/Technology sector exposure/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Dismiss alert" })[0],
    );

    expect(
      screen.queryByText(/Technology sector exposure/),
    ).not.toBeInTheDocument();
  });

  it("changes VaR method and confidence", () => {
    render(<WidgetContent id="var" />);

    fireEvent.change(
      screen.getByRole("combobox", { name: "VaR method" }),
      {
        target: { value: "parametric" },
      },
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "VaR confidence" }),
      {
        target: { value: "0.95" },
      },
    );

    expect(
      screen.getByText(/parametric simulation/),
    ).toBeInTheDocument();

    expect(
      screen.getByText("95.0% confidence"),
    ).toBeInTheDocument();
  });

  it("changes correlation lookback window", () => {
    render(<WidgetContent id="correlation" />);

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Correlation lookback",
      }),
      {
        target: { value: "90" },
      },
    );

    expect(
      screen.getByRole("combobox", {
        name: "Correlation lookback",
      }),
    ).toHaveValue("90");

    expect(screen.getByText("NIFTY")).toBeInTheDocument();
  });
});