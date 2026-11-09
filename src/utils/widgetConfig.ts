export interface WidgetConfig {
  title?: string;
  refreshInterval?: number;
  settings?: Record<string, unknown>;
}

type WidgetConfigMap = Record<string, WidgetConfig>;

const STORAGE_KEY = "meridian-widget-config-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function sanitizeConfig(value: unknown): WidgetConfig | null {
  if (!isRecord(value)) return null;

  const config: WidgetConfig = {};

  if (value.title !== undefined) {
    if (
      typeof value.title !== "string" ||
      !value.title.trim() ||
      value.title.length > 60
    ) {
      return null;
    }

    config.title = value.title.trim();
  }

  if (value.refreshInterval !== undefined) {
    if (
      typeof value.refreshInterval !== "number" ||
      !Number.isInteger(value.refreshInterval) ||
      value.refreshInterval < 1000 ||
      value.refreshInterval > 300000
    ) {
      return null;
    }

    config.refreshInterval = value.refreshInterval;
  }

  if (value.settings !== undefined) {
    if (!isRecord(value.settings)) return null;
    config.settings = value.settings;
  }

  return config;
}

export function getAllWidgetConfigs(): WidgetConfigMap {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return {};

    const parsed: unknown = JSON.parse(saved);

    if (!isRecord(parsed)) return {};

    const configs: WidgetConfigMap = {};

    for (const [id, value] of Object.entries(parsed)) {
      if (!id.trim()) continue;

      const config = sanitizeConfig(value);

      if (config) {
        configs[id] = config;
      }
    }

    return configs;
  } catch {
    return {};
  }
}

export function getWidgetConfig(id: string): WidgetConfig {
  return getAllWidgetConfigs()[id] ?? {};
}

export function saveWidgetConfig(
  id: string,
  config: WidgetConfig,
): WidgetConfigMap {
  if (!id.trim()) {
    throw new Error("Widget ID is required.");
  }

  const sanitized = sanitizeConfig(config);

  if (!sanitized) {
    throw new Error("Invalid widget configuration.");
  }

  const configs = getAllWidgetConfigs();

  configs[id] = {
    ...configs[id],
    ...sanitized,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));

  return configs;
}

export function deleteWidgetConfig(id: string): WidgetConfigMap {
  const configs = getAllWidgetConfigs();

  delete configs[id];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));

  return configs;
}
export function replaceAllWidgetConfigs(
  configs: Record<string, WidgetConfig>,
): WidgetConfigMap {
  const validated: WidgetConfigMap = {};

  for (const [id, config] of Object.entries(configs)) {
    if (!id.trim()) {
      throw new Error("Invalid widget ID.");
    }

    const sanitized = sanitizeConfig(config);

    if (!sanitized) {
      throw new Error(`Invalid configuration for widget: ${id}`);
    }

    validated[id] = sanitized;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));

  return validated;
}