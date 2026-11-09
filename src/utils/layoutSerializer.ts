
import {
  isValidLayoutItems,
  type DashboardLayoutItem,
} from "./layoutValidation";

export interface DashboardLayoutFile {
  version: number;
  exportedAt: string;
  layouts: {
    lg: DashboardLayoutItem[];
    md: DashboardLayoutItem[];
    sm: DashboardLayoutItem[];
    xs: DashboardLayoutItem[];
  };
}

const CURRENT_VERSION = 1;

const BREAKPOINT_COLUMNS = {
  lg: 12,
  md: 8,
  sm: 4,
  xs: 2,
};

export function exportLayout(layouts: DashboardLayoutFile["layouts"]): string {
  const valid = Object.entries(BREAKPOINT_COLUMNS).every(
    ([breakpoint, columns]) =>
      isValidLayoutItems(layouts[breakpoint as keyof typeof layouts], columns)
  );

  if (!valid) {
    throw new Error("Cannot export invalid dashboard layout.");
  }

  const file: DashboardLayoutFile = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    layouts,
  };

  return JSON.stringify(file, null, 2);
}

export function importLayout(json: string): DashboardLayoutFile["layouts"] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid layout file.");
  }

  const file = parsed as Record<string, unknown>;

  if (file.version !== CURRENT_VERSION) {
    throw new Error("Unsupported layout file version.");
  }

  if (!file.layouts || typeof file.layouts !== "object") {
    throw new Error("Layout data is missing.");
  }

  const layouts = file.layouts as Record<string, unknown>;

  for (const [breakpoint, columns] of Object.entries(BREAKPOINT_COLUMNS)) {
    if (!isValidLayoutItems(layouts[breakpoint], columns)) {
      throw new Error(`Invalid layout for breakpoint: ${breakpoint}`);
    }
  }

  return layouts as DashboardLayoutFile["layouts"];
}
