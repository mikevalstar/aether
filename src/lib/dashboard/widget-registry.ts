import type { LayoutItem, ResponsiveLayouts } from "react-grid-layout";

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
export const COLS = { lg: 4, md: 4, sm: 2, xs: 1 };
export const ROW_HEIGHT = 10;
export const MARGIN: [number, number] = [16, 16];

type DefaultWidgetLayout = {
  lg: LayoutItem;
  sm: LayoutItem;
  xs: LayoutItem;
};

const BUILTIN_DEFAULTS: Record<string, DefaultWidgetLayout> = {
  calendar: {
    lg: { i: "calendar", x: 0, y: 0, w: 2, h: 25 },
    sm: { i: "calendar", x: 0, y: 0, w: 1, h: 25 },
    xs: { i: "calendar", x: 0, y: 0, w: 1, h: 25 },
  },
  "day-detail": {
    lg: { i: "day-detail", x: 2, y: 0, w: 1, h: 25 },
    sm: { i: "day-detail", x: 1, y: 0, w: 1, h: 25 },
    xs: { i: "day-detail", x: 0, y: 25, w: 1, h: 18 },
  },
  "usage-stat": {
    lg: { i: "usage-stat", x: 3, y: 0, w: 1, h: 5 },
    sm: { i: "usage-stat", x: 0, y: 28, w: 1, h: 5 },
    xs: { i: "usage-stat", x: 0, y: 43, w: 1, h: 5 },
  },
  "next-event": {
    lg: { i: "next-event", x: 3, y: 5, w: 1, h: 12 },
    sm: { i: "next-event", x: 1, y: 28, w: 1, h: 12 },
    xs: { i: "next-event", x: 0, y: 48, w: 1, h: 12 },
  },
  "board-column": {
    lg: { i: "board-column", x: 3, y: 17, w: 1, h: 16 },
    sm: { i: "board-column", x: 0, y: 40, w: 1, h: 16 },
    xs: { i: "board-column", x: 0, y: 60, w: 1, h: 16 },
  },
  "recent-chats": {
    lg: { i: "recent-chats", x: 3, y: 33, w: 1, h: 18 },
    sm: { i: "recent-chats", x: 1, y: 40, w: 1, h: 18 },
    xs: { i: "recent-chats", x: 0, y: 76, w: 1, h: 18 },
  },
  "activity-digest": {
    lg: { i: "activity-digest", x: 3, y: 51, w: 1, h: 18 },
    sm: { i: "activity-digest", x: 0, y: 58, w: 2, h: 14 },
    xs: { i: "activity-digest", x: 0, y: 94, w: 1, h: 14 },
  },
};

/** Map plugin size to default column span */
function pluginColSpan(size: "quarter" | "half" | "three-quarter" | "full"): number {
  switch (size) {
    case "quarter":
      return 1;
    case "half":
      return 2;
    case "three-quarter":
      return 3;
    case "full":
      return 4;
  }
}

/**
 * Build default layouts for a given set of active widget IDs.
 * Plugin widgets should be passed as `plugin:<pluginId>-<widgetId>` with their size.
 */
export function getDefaultLayouts(
  activeWidgetIds: string[],
  pluginSizes: Record<string, "quarter" | "half" | "three-quarter" | "full">,
): ResponsiveLayouts {
  const lg: LayoutItem[] = [];
  const sm: LayoutItem[] = [];
  const xs: LayoutItem[] = [];

  for (const id of activeWidgetIds) {
    const builtin = BUILTIN_DEFAULTS[id];
    if (builtin) {
      lg.push(builtin.lg);
      sm.push(builtin.sm);
      xs.push(builtin.xs);
    } else {
      // Plugin widget — place below built-ins
      const size = pluginSizes[id] ?? "half";
      const w = pluginColSpan(size);
      const item: LayoutItem = { i: id, x: 0, y: 200, w, h: 14 }; // y=200 lets compaction sort it
      lg.push(item);
      sm.push({ ...item, w: Math.min(w, 2) });
      xs.push({ ...item, w: 1 });
    }
  }

  // md mirrors lg
  return { lg, md: lg, sm, xs };
}
