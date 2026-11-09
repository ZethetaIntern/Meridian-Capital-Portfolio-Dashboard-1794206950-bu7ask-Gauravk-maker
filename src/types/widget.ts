
import type { ComponentType } from 'react';
import type { ZodType } from 'zod';

/**
 * Categories supported by the dashboard widget system.
 */
export type WidgetCategory =
  | 'CHART'
  | 'TABLE'
  | 'FEED'
  | 'GAUGE'
  | 'ANALYSIS';

/**
 * Widget dimensions used by the dashboard grid.
 */
export interface WidgetSize {
  w: number;
  h: number;
}

/**
 * Props passed to each widget component.
 */
export interface WidgetComponentProps<
  TConfig = Record<string, unknown>,
  TData = unknown
> {
  config: TConfig;
  data: TData;
}

/**
 * Configuration for the widget's data source.
 */
export interface WidgetDataSource {
  refreshMs: number;
  endpoint?: string;
  enabled?: boolean;
}

/**
 * Complete definition of a dashboard widget.
 */
export interface WidgetDefinition<
  TConfig = Record<string, unknown>,
  TData = unknown
> {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;

  /** Icon name used in the widget gallery. */
  icon?: string;

  /** Default grid dimensions. */
  defaultSize: WidgetSize;

  /** Minimum grid dimensions. */
  minSize: WidgetSize;

  /** Maximum grid dimensions. */
  maxSize?: WidgetSize;

  /** Default widget configuration. */
  defaultConfig: TConfig;

  /** Optional Zod schema for validating widget configuration. */
  configSchema?: ZodType<TConfig>;

  /** React component responsible for rendering the widget. */
  component: ComponentType<WidgetComponentProps<TConfig, TData>>;

  /** Data refresh and API configuration. */
  dataSource: WidgetDataSource;
}

/**
 * Holding information used by the portfolio dashboard.
 */
export interface Holding {
  ticker: string;
  name: string;
  sector: string;
  assetClass: string;
  quantity: number;
  price: number;
  marketValue: number;
  pnl: number;
  weight: number;
}

/**
 * Summary metrics for the complete portfolio.
 */
export interface PortfolioSummary {
  aum: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  mtdReturn: number;
  ytdReturn: number;
  sharpeRatio: number;
  lastUpdated: string;
}
