
import type { WidgetDefinition, WidgetCategory } from '../types/widget';

const registry = new Map<string, WidgetDefinition>();

export type WidgetConfigValidationResult =
  | {
      success: true;
      data: unknown;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Register a widget in the dashboard registry.
 * Duplicate widget IDs are not allowed.
 */
export function registerWidget(definition: WidgetDefinition): void {
  if (!definition.id || !definition.id.trim()) {
    throw new Error('Widget ID is required.');
  }

  if (registry.has(definition.id)) {
    throw new Error(`Widget already registered: ${definition.id}`);
  }

  if (
    definition.minSize.w > definition.defaultSize.w ||
    definition.minSize.h > definition.defaultSize.h
  ) {
    throw new Error(
      `Invalid default size for widget: ${definition.id}`
    );
  }

  if (
    definition.maxSize &&
    (definition.defaultSize.w > definition.maxSize.w ||
      definition.defaultSize.h > definition.maxSize.h)
  ) {
    throw new Error(
      `Default size exceeds maximum size for widget: ${definition.id}`
    );
  }

  registry.set(definition.id, definition);
}

/**
 * Find a widget using its unique ID.
 */
export function getWidget(
  id: string
): WidgetDefinition | undefined {
  return registry.get(id);
}

/**
 * Check whether a widget is registered.
 */
export function hasWidget(id: string): boolean {
  return registry.has(id);
}

/**
 * Return all registered widgets.
 */
export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}

/**
 * Return widgets belonging to a particular category.
 */
export function getWidgetsByCategory(
  category: WidgetCategory
): WidgetDefinition[] {
  return getAllWidgets().filter(
    (widget) => widget.category === category
  );
}

/**
 * Validate a widget's configuration using its Zod schema.
 */
export function validateWidgetConfig(
  id: string,
  config: unknown
): WidgetConfigValidationResult {
  const widget = getWidget(id);

  if (!widget) {
    return {
      success: false,
      error: `Widget not found: ${id}`,
    };
  }

  // Widgets without a schema accept their supplied configuration.
  if (!widget.configSchema) {
    return {
      success: true,
      data: config,
    };
  }

  const result = widget.configSchema.safeParse(config);

  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => {
        const field = issue.path.join('.');
        return field
          ? `${field}: ${issue.message}`
          : issue.message;
      })
      .join('; ');

    return {
      success: false,
      error: errorMessage,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Remove a widget from the registry.
 */
export function unregisterWidget(id: string): boolean {
  return registry.delete(id);
}

/**
 * Clear all registered widgets.
 * Useful for isolated unit tests.
 */
export function clearRegistry(): void {
  registry.clear();
}
