import { isSameDay } from "date-fns";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Layout,
  type LayoutItem,
  ResponsiveGridLayout,
  type ResponsiveLayouts,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import { DashboardBoardColumn } from "#/components/board/DashboardBoardColumn";
import { CalendarWidget } from "#/components/calendar/CalendarWidget";
import { DayDetailPanel } from "#/components/calendar/DayDetailPanel";
import { NextEventCard } from "#/components/calendar/NextEventCard";
import { ActivityDigest } from "#/components/dashboard/ActivityDigest";
import { RecentChats } from "#/components/dashboard/RecentChats";
import { UsageStat } from "#/components/dashboard/UsageStat";
import { Button } from "#/components/ui/button";
import type { KanbanColumn } from "#/lib/board/kanban-parser";
import type { CalendarEvent } from "#/lib/calendar/types";
import { saveDashboardLayout } from "#/lib/dashboard/layout-persistence";
import { BREAKPOINTS, COLS, getDefaultLayouts, MARGIN, ROW_HEIGHT } from "#/lib/dashboard/widget-registry";
import type { DashboardData } from "#/lib/dashboard.functions";
import { plugins } from "#/plugins";
import type { PluginWidgetInfo } from "#/plugins/dashboard.functions";
import { createPluginClientContextFromOptions } from "#/plugins/plugin-client-context";

import "react-grid-layout/css/styles.css";

type DashboardGridProps = {
  calendarEvents: CalendarEvent[];
  boardColumn: KanbanColumn | null;
  dashboardData: DashboardData;
  pluginWidgets: PluginWidgetInfo[];
  savedLayouts: ResponsiveLayouts | null;
};

/** Convert pixel height to grid row units */
function pxToRows(px: number): number {
  // Each row = ROW_HEIGHT + MARGIN[1], but last row has no trailing margin
  // Formula: px = h * ROW_HEIGHT + (h - 1) * MARGIN[1]
  // Solving: h = (px + MARGIN[1]) / (ROW_HEIGHT + MARGIN[1])
  return Math.ceil((px + MARGIN[1]) / (ROW_HEIGHT + MARGIN[1]));
}

function serializeLayouts(
  allLayouts: ResponsiveLayouts,
): Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>> {
  const serializable: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>> = {};
  for (const [bp, items] of Object.entries(allLayouts)) {
    if (items) {
      serializable[bp] = items.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));
    }
  }
  return serializable;
}

export function DashboardGrid({
  calendarEvents,
  boardColumn,
  dashboardData,
  pluginWidgets,
  savedLayouts,
}: DashboardGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const hasCalendar = calendarEvents.length > 0;

  // Shared selected date between calendar and day-detail widgets
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Track measured heights per widget
  const measuredHeights = useRef<Record<string, number>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isDragging = useRef(false);

  // Build active widget IDs and plugin size map
  const { activeWidgetIds, pluginSizes } = useMemo(() => {
    const ids: string[] = [];
    const sizes: Record<string, "quarter" | "half" | "three-quarter" | "full"> = {};

    if (hasCalendar) ids.push("calendar");
    if (hasCalendar) ids.push("day-detail");
    ids.push("usage-stat");
    if (hasCalendar) ids.push("next-event");
    if (boardColumn) ids.push("board-column");
    ids.push("recent-chats");
    ids.push("activity-digest");

    for (const pw of pluginWidgets) {
      for (const w of pw.widgets) {
        const id = `plugin:${pw.pluginId}-${w.id}`;
        ids.push(id);
        sizes[id] = w.size;
      }
    }

    return { activeWidgetIds: ids, pluginSizes: sizes };
  }, [hasCalendar, boardColumn, pluginWidgets]);

  const defaultLayouts = useMemo(() => getDefaultLayouts(activeWidgetIds, pluginSizes), [activeWidgetIds, pluginSizes]);

  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => {
    if (!savedLayouts) return defaultLayouts;

    const merged: ResponsiveLayouts = {};
    for (const bp of Object.keys(defaultLayouts)) {
      const saved = savedLayouts[bp];
      if (!saved) {
        merged[bp] = defaultLayouts[bp];
        continue;
      }

      const activeSet = new Set(activeWidgetIds);
      const existing = saved.filter((item) => activeSet.has(item.i));
      const existingIds = new Set(existing.map((item) => item.i));

      const defaults = defaultLayouts[bp] ?? [];
      const newItems = defaults.filter((item) => !existingIds.has(item.i));
      merged[bp] = [...existing, ...newItems];
    }
    return merged;
  });

  // Auto-height: persistent ResizeObserver that measures content and updates layout heights
  const observerRef = useRef<ResizeObserver | null>(null);
  if (!observerRef.current) {
    observerRef.current = new ResizeObserver((entries) => {
      if (isDragging.current) return;

      let changed = false;
      const updates: Record<string, number> = {};

      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const widgetId = el.dataset.widgetId;
        if (!widgetId) continue;

        const contentHeight = el.scrollHeight;
        const newH = pxToRows(contentHeight);
        const prevH = measuredHeights.current[widgetId];

        if (prevH !== newH && newH > 0) {
          measuredHeights.current[widgetId] = newH;
          updates[widgetId] = newH;
          changed = true;
        }
      }

      if (changed) {
        setLayouts((prev) => {
          const next: ResponsiveLayouts = {};
          for (const [bp, items] of Object.entries(prev)) {
            if (!items) continue;
            next[bp] = items.map((item: LayoutItem) => {
              const newH = updates[item.i];
              if (newH && newH !== item.h) {
                return { ...item, h: newH };
              }
              return item;
            });
          }
          return next;
        });
      }
    });
  }

  // Cleanup observer on unmount
  useEffect(() => {
    const obs = observerRef.current;
    return () => obs?.disconnect();
  }, []);

  const setContentRef = useCallback((id: string, el: HTMLDivElement | null) => {
    const prev = contentRefs.current[id];
    if (prev && observerRef.current) observerRef.current.unobserve(prev);
    contentRefs.current[id] = el;
    if (el && observerRef.current) observerRef.current.observe(el);
  }, []);

  // Debounced save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLayoutChange = useCallback((_currentLayout: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDashboardLayout({ data: { layouts: serializeLayouts(allLayouts) } }).catch(console.error);
    }, 800);
  }, []);

  const handleReset = useCallback(() => {
    measuredHeights.current = {};
    setLayouts(defaultLayouts);
    saveDashboardLayout({ data: { layouts: serializeLayouts(defaultLayouts) } }).catch(console.error);
  }, [defaultLayouts]);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleDragStop = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Render widget by ID
  const renderWidget = (id: string) => {
    switch (id) {
      case "calendar":
        return <CalendarWidget events={calendarEvents} selectedDate={selectedDate} onSelectedDateChange={setSelectedDate} />;
      case "day-detail": {
        const dayEvents = calendarEvents.filter((e) => {
          const eventStart = new Date(e.start);
          const eventEnd = new Date(e.end);
          if (e.allDay) {
            const dayStart = new Date(selectedDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(selectedDate);
            dayEnd.setHours(23, 59, 59, 999);
            return eventStart <= dayEnd && eventEnd >= dayStart;
          }
          return isSameDay(eventStart, selectedDate);
        });
        return <DayDetailPanel date={selectedDate} events={dayEvents} />;
      }
      case "usage-stat":
        return <UsageStat usage={dashboardData.usage} />;
      case "next-event":
        return <NextEventCard events={calendarEvents} />;
      case "board-column":
        return boardColumn ? <DashboardBoardColumn column={boardColumn} /> : null;
      case "recent-chats":
        return <RecentChats threads={dashboardData.recentThreads} />;
      case "activity-digest":
        return <ActivityDigest items={dashboardData.recentActivity} />;
      default: {
        if (!id.startsWith("plugin:")) return null;
        const rest = id.slice("plugin:".length);
        const dashIdx = rest.indexOf("-");
        if (dashIdx === -1) return null;
        const pluginId = rest.slice(0, dashIdx);
        const widgetId = rest.slice(dashIdx + 1);

        const pw = pluginWidgets.find((p) => p.pluginId === pluginId);
        if (!pw) return null;

        const plugin = plugins.find((p) => p.meta.id === pluginId);
        const widgetDef = plugin?.client?.widgets?.find((w) => w.id === widgetId);
        if (!widgetDef) return null;

        const ctx = createPluginClientContextFromOptions(pluginId, pw.options);
        const WidgetComponent = widgetDef.component;
        return <WidgetComponent ctx={ctx} data={pw.data} />;
      }
    }
  };

  return (
    <div ref={containerRef}>
      <div className="mb-2 flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={handleReset}>
          <RotateCcw className="size-3" />
          Reset layout
        </Button>
      </div>
      {mounted && width > 0 && (
        <ResponsiveGridLayout
          className="dashboard-grid"
          width={width}
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          compactor={verticalCompactor}
          resizeConfig={{ enabled: false, handles: [] }}
          dragConfig={{ enabled: true, handle: ".dashboard-drag-handle" }}
        >
          {activeWidgetIds.map((id) => (
            <div key={id} className="dashboard-grid-item">
              <div className="dashboard-drag-handle" />
              <div ref={(el) => setContentRef(id, el)} data-widget-id={id} className="dashboard-grid-item-content">
                {renderWidget(id)}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
