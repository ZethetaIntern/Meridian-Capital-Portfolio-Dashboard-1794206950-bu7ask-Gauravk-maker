
export interface DashboardLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function isValidLayoutItems(
  items: unknown,
  columns: number
): items is DashboardLayoutItem[] {
  if (!Array.isArray(items) || columns <= 0) {
    return false;
  }

  const widgetIds = new Set<string>();

  for (const item of items) {
    if (!item || typeof item !== "object") {
      return false;
    }

    const layout = item as Record<string, unknown>;

    if (
      typeof layout.i !== "string" ||
      layout.i.trim() === "" ||
      !Number.isInteger(layout.x) ||
      !Number.isInteger(layout.y) ||
      !Number.isInteger(layout.w) ||
      !Number.isInteger(layout.h)
    ) {
      return false;
    }

    const { i, x, y, w, h } = layout as unknown as DashboardLayoutItem;

    if (
      widgetIds.has(i) ||
      x < 0 ||
      y < 0 ||
      w <= 0 ||
      h <= 0 ||
      x + w > columns
    ) {
      return false;
    }

    widgetIds.add(i);
  }

  return true;
}
