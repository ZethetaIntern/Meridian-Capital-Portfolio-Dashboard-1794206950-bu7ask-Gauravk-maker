
import { z } from 'zod';
import type { WidgetCategory, WidgetDefinition } from '../types/widget';
import { WidgetContent, widgetMeta } from '../widgets/WidgetContent';
import { hasWidget, registerWidget } from './widgetRegistry';

/**
 * Category assigned to each built-in dashboard widget.
 */
const categories: Record<string, WidgetCategory> = {
  allocation: 'CHART',
  performance: 'CHART',
  heatmap: 'CHART',
  holdings: 'TABLE',
  news: 'FEED',
  alerts: 'FEED',
  var: 'GAUGE',
  correlation: 'ANALYSIS',
  attribution: 'CHART',
  ticker: 'FEED',
  drawdown: 'CHART',
  treemap: 'CHART',
};

/**
 * Icon identifiers used by the widget gallery.
 * These are Lucide icon names represented as strings.
 */
const icons: Record<string, string> = {
  allocation: 'pie-chart',
  performance: 'chart-line',
  heatmap: 'grid-3x3',
  holdings: 'table',
  news: 'newspaper',
  alerts: 'bell',
  var: 'gauge',
  correlation: 'chart-scatter',
  attribution: 'chart-column',
  ticker: 'radio',
  drawdown: 'trending-down',
  treemap: 'blocks',
};

/**
 * Initial generic configuration schema.
 * Individual widgets can receive stricter schemas later.
 */
const widgetConfigSchema = z.record(z.string(), z.unknown());

/**
 * Refresh intervals in milliseconds.
 */
const refreshIntervals: Record<string, number> = {
  ticker: 5000,
  holdings: 10000,
  allocation: 30000,
  performance: 30000,
  heatmap: 30000,
  news: 30000,
  alerts: 15000,
  var: 30000,
  correlation: 30000,
  attribution: 30000,
  drawdown: 30000,
  treemap: 30000,
};

/**
 * Register all built-in dashboard widgets.
 */
export function registerBuiltInWidgets(): void {
  Object.entries(widgetMeta).forEach(([id, meta]) => {
    const category = categories[id];
    const icon = icons[id];

    if (!category) {
      throw new Error(`Missing category for built-in widget: ${id}`);
    }

    if (!icon) {
      throw new Error(`Missing icon for built-in widget: ${id}`);
    }

    // Avoid duplicate registration during development/HMR.
    if (hasWidget(id)) {
      return;
    }

    const definition: WidgetDefinition = {
      id,
      name: meta.title,
      description: meta.subtitle,
      category,
      icon,

      defaultSize: meta.size,
      minSize: meta.min,
      maxSize: {
        w: 12,
        h: 8,
      },

      defaultConfig: {},
      configSchema: widgetConfigSchema,

      component: () => <WidgetContent id={id} />,

      dataSource: {
        refreshMs: refreshIntervals[id] ?? 30000,
        enabled: true,
      },
    };

    registerWidget(definition);
  });
}

// Register built-in widgets when this module is loaded.
registerBuiltInWidgets();
