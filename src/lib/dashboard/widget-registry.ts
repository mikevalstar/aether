import type { LayoutItem, ResponsiveLayouts } from "react-grid-layout";

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
export const COLS = { lg: 4, md: 4, sm: 2, xs: 1 };
export const ROW_HEIGHT = 30;
export const MARGIN: [number, number] = [16, 16];

type DefaultWidgetLayout = {
  lg: LayoutItem;
  sm: LayoutItem;
  xs: LayoutItem;
};

const BUILTIN_DEFAULTS: Record<string, DefaultWidgetLayout> = {
  calendar: {
    lg: { i: "calendar", x: 0, y: 0, w: 2, h: 14 },
    sm: { i: "calendar", x: 0, y: 0, w: 1, h: 14 },
    xs: { i: "calendar", x: 0, y: 0, w: 1, h: 14 },
  },
  "day-detail": {
    lg: { i: "day-detail", x: 2, y: 0, w: 1, h: 14 },
    sm: { i: "day-detail", x: 1, y: 0, w: 1, h: 14 },
    xs: { i: "day-detail", x: 0, y: 14, w: 1, h: 10 },
  },
  "usage-stat": {
    lg: { i: "usage-stat", x: 3, y: 0, w: 1, h: 3 },
    sm: { i: "usage-stat", x: 0, y: 16, w: 1, h: 3 },
    xs: { i: "usage-stat", x: 0, y: 24, w: 1, h: 3 },
  },
  "next-event": {
    lg: { i: "next-event", x: 3, y: 3, w: 1, h: 7 },
    sm: { i: "next-event", x: 1, y: 16, w: 1, h: 7 },
    xs: { i: "next-event", x: 0, y: 23, w: 1, h: 7 },
  },
  "board-column": {
    lg: { i: "board-column", x: 3, y: 10, w: 1, h: 9 },
    sm: { i: "board-column", x: 0, y: 23, w: 1, h: 9 },
    xs: { i: "board-column", x: 0, y: 30, w: 1, h: 9 },
  },
  "recent-chats": {
    lg: { i: "recent-chats", x: 3, y: 19, w: 1, h: 10 },
    sm: { i: "recent-chats", x: 1, y: 23, w: 1, h: 10 },
    xs: { i: "recent-chats", x: 0, y: 39, w: 1, h: 10 },
  },
  "activity-digest": {
    lg: { i: "activity-digest", x: 3, y: 29, w: 1, h: 10 },
    sm: { i: "activity-digest", x: 0, y: 33, w: 2, h: 8 },
    xs: { i: "activity-digest", x: 0, y: 49, w: 1, h: 8 },
  },
};

/** Map plugin size to default column span */
function pluginColSpan(size: "quarter" | "half" | "three-quarter" | "full"): number {
  switch (size) {
    case "quarter": return 1;
    case "half": return 2;
    case "three-quarter": return 3;
    case "full": return 4;
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
      const item: LayoutItem = { i: id, x: 0, y: 100, w, h: 8 }; // y=100 lets compaction sort it
      lg.push(item);
      sm.push({ ...item, w: Math.min(w, 2) });
      xs.push({ ...item, w: 1 });
    }
  }

  // md mirrors lg
  return { lg, md: lg, sm, xs };
}
