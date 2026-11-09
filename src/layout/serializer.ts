import { z } from "zod";

export const MAX_LAYOUT_BYTES = 50 * 1024;

export const LayoutSchema = z
  .object({
    version: z.string().min(1).max(20),
    name: z.string().min(1).max(60),
    theme: z.enum(["dark", "light", "contrast"]),
    widgets: z
      .array(
        z.object({
          i: z.string().min(1).max(64),
          x: z.number().int().nonnegative().max(1000),
          y: z.number().int().nonnegative().max(10000),
          w: z.number().int().positive().max(12),
          h: z.number().int().positive().max(100),
        }),
      )
      .max(100),
    widgetConfigs: z
      .record(
        z.string(),
        z
          .object({
            title: z.string().min(1).max(60).optional(),
            refreshInterval: z.number().int().min(1000).max(300000).optional(),
            settings: z.record(z.string(), z.unknown()).optional(),
          })
          .strict(),
      )
      .optional(),
  })

  .superRefine((layout, ctx) => {
    if (layout.version !== "1.0.0") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unsupported layout file version.",
        path: ["version"],
      });
    }

    const ids = layout.widgets.map((widget) => widget.i);

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Widget IDs must be unique.",
        path: ["widgets"],
      });
    }

    layout.widgets.forEach((widget, index) => {
      if (widget.x + widget.w > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Widget ${widget.i} exceeds the dashboard width.`,
          path: ["widgets", index, "w"],
        });
      }
    });
  });

export type SavedLayout = z.infer<typeof LayoutSchema>;

export function serializeLayout(layout: SavedLayout): string {
  const json = JSON.stringify(LayoutSchema.parse(layout));

  if (new TextEncoder().encode(json).byteLength > MAX_LAYOUT_BYTES) {
    throw new Error("Layout export exceeds the 50KB size limit.");
  }

  return json;
}

export function deserializeLayout(json: string): SavedLayout {
  if (new TextEncoder().encode(json).byteLength > MAX_LAYOUT_BYTES) {
    throw new Error("Layout file exceeds the 50KB size limit.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  return LayoutSchema.parse(parsed);
}

export function saveLayout(layout: SavedLayout): void {
  localStorage.setItem("meridian-layout", serializeLayout(layout));
}

export function loadLayout(): SavedLayout | null {
  const value = localStorage.getItem("meridian-layout");

  return value ? deserializeLayout(value) : null;
}
