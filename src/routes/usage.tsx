import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ChartLine, CircleDollarSign, Coins, Hash, Layers, MessageSquare, TrendingUp, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";
import { PageHeader } from "#/components/PageHeader";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { ChartCard } from "#/components/ui/chart-card";
import { DateRangePicker } from "#/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { StatCard } from "#/components/ui/stat-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { getSession } from "#/lib/auth.functions";
import { threadIdToSlug } from "#/lib/chat/chat";
import { formatUsageCurrency, getTaskTypeLabel, normalizeUsageSearch, TASK_TYPES } from "#/lib/chat/chat-usage";
import { type ChatUsageStatsResult, getChatUsageStats } from "#/lib/chat/chat-usage.functions";
import { formatDateTime } from "#/lib/date";

const VIEW_MODES = ["cost", "tokens", "prompts"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const usageSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  model: z.string().optional(),
  taskType: z.string().optional(),
  view: z.enum(VIEW_MODES).optional(),
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const Route = createFileRoute("/usage")({
  validateSearch: usageSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const { view: _view, ...serverParams } = deps;
    return await getChatUsageStats({ data: serverParams });
  },
  component: UsagePage,
});

function UsagePage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const data = Route.useLoaderData() as ChatUsageStatsResult;
  const rawSearch = Route.useSearch() as {
    from?: string;
    to?: string;
    model?: string;
    taskType?: string;
    view?: ViewMode;
  };
  const search = normalizeUsageSearch(rawSearch);
  const view: ViewMode = rawSearch.view && VIEW_MODES.includes(rawSearch.view) ? rawSearch.view : "cost";

  const hasData = data.totals.events > 0;

  function updateSearch(next: { from?: string; to?: string; model?: string; taskType?: string; view?: ViewMode }) {
    void navigate({
      search: {
        from: next.from,
        to: next.to,
        model: next.model,
        taskType: next.taskType,
        view: next.view,
      },
      replace: true,
    });
  }

  function setView(v: ViewMode) {
    updateSearch({ from: search.from, to: search.to, model: search.model, taskType: search.taskType, view: v });
  }

  return (
    <PageHeader
      icon={ChartLine}
      label="Usage"
      color="text-[var(--coral)]"
      title="Usage"
      highlight="analytics"
      description="Track spend, token volume, and prompt count across every completed chat exchange."
      glows={[
        { color: "var(--coral)", size: "size-[500px]", position: "-right-48 -top-48" },
        { color: "var(--teal)", size: "size-[350px]", position: "-left-36 top-96" },
      ]}
      actions={
        <Button asChild variant="outline" className="gap-2">
          <Link to="/chat">
            <MessageSquare className="size-3.5" />
            Open chat
          </Link>
        </Button>
      }
    >
      <section className="surface-card mb-6 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Date range</p>
            <DateRangePicker
              from={search.from}
              to={search.to}
              onChange={({ from, to }) => {
                updateSearch({
                  from,
                  to,
                  model: search.model,
                  taskType: search.taskType,
                  view,
                });
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Model</p>
            <Select
              value={search.model}
              onValueChange={(value) => {
                updateSearch({
                  from: search.from,
                  to: search.to,
                  model: value,
                  taskType: search.taskType,
                  view,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All models" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                {data.availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Task type</p>
            <Select
              value={search.taskType}
              onValueChange={(value) => {
                updateSearch({
                  from: search.from,
                  to: search.to,
                  model: search.model,
                  taskType: value,
                  view,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tasks</SelectItem>
                {TASK_TYPES.map((taskType) => (
                  <SelectItem key={taskType} value={taskType}>
                    {getTaskTypeLabel(taskType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* View mode toggle */}
      <section className="mb-6 flex w-fit gap-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-1">
        <ViewModeButton active={view === "cost"} onClick={() => setView("cost")} icon={CircleDollarSign} label="Cost" />
        <ViewModeButton active={view === "tokens"} onClick={() => setView("tokens")} icon={Coins} label="Tokens" />
        <ViewModeButton active={view === "prompts"} onClick={() => setView("prompts")} icon={Zap} label="Prompts" />
      </section>

      {/* Stat cards — adapt to view mode */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ViewStatCards data={data} view={view} />
      </section>

      {hasData ? (
        <>
          <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
            <ViewMainChart data={data} view={view} />
            <ViewModelMix data={data} view={view} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <ChartCard
              title="Recent exchanges"
              subtitle="Latest tracked chat completions in this view."
              icon={MessageSquare}
              accentColor="var(--coral)"
            >
              <div className="grid gap-2">
                {data.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3 text-[var(--ink-soft)]">
                        <span className="shrink-0">{formatDateTime(event.createdAt)}</span>
                        <span className="shrink-0 text-[var(--ink)]">{event.modelLabel}</span>
                        <Badge variant="outline" className="shrink-0">
                          {getTaskTypeLabel(event.taskType)}
                        </Badge>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">{event.totalTokens.toLocaleString()} tokens</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              In: {event.inputTokens.toLocaleString()} / Out: {event.outputTokens.toLocaleString()}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="font-medium text-[var(--ink)]">{formatUsageCurrency(event.estimatedCostUsd)}</span>
                      </div>
                    </div>
                    {event.threadTitle && (
                      <div className="mt-1 truncate text-xs text-[var(--ink-soft)]">
                        {event.threadId ? (
                          <Link
                            to="/chat/$threadId"
                            params={{ threadId: threadIdToSlug(event.threadId) }}
                            className="hover:text-[var(--teal)] transition-colors"
                          >
                            {event.threadTitle}
                          </Link>
                        ) : (
                          event.threadTitle
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              title="What gets tracked"
              subtitle="Saved per completed assistant response."
              icon={Hash}
              accentColor="var(--chart-4)"
            >
              <div className="grid gap-2 text-sm text-[var(--ink-soft)]">
                <TrackedField label="User" value="Owner of the usage event" />
                <TrackedField label="Thread" value="Optional chat thread id for drill-down" />
                <TrackedField label="Model" value="Claude model used for the exchange" />
                <TrackedField label="Tokens" value="Input, output, and total token counts" />
                <TrackedField label="Cost" value="Estimated USD based on model pricing" />
                <TrackedField label="Time" value="Timestamp recorded when the exchange finishes" />
              </div>
            </ChartCard>
          </section>
        </>
      ) : (
        <section className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-[var(--coral)]/10 text-[var(--coral)]">
            <ChartLine className="size-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold">No usage data yet</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--ink-soft)]">
            Start chatting and completed responses will appear here with costs, tokens, and model trends.
          </p>
          <Button asChild className="mt-5 gap-2">
            <Link to="/chat">
              <MessageSquare className="size-3.5" />
              Start a chat
            </Link>
          </Button>
        </section>
      )}
    </PageHeader>
  );
}

/* ── View mode button ────────────────────────────────────── */

function ViewModeButton(props: {
  active: boolean;
  onClick: () => void;
  icon: (props: { className?: string }) => React.ReactNode;
  label: string;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        props.active ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
      }`}
    >
      <Icon className="size-3.5" />
      {props.label}
    </button>
  );
}

/* ── View-adaptive stat cards ────────────────────────────── */

function ViewStatCards({ data, view }: { data: ChatUsageStatsResult; view: ViewMode }) {
  const t = data.totals;

  if (view === "tokens") {
    return (
      <>
        <StatCard
          label="Total tokens"
          value={Math.round(t.totalTokens).toLocaleString()}
          detail={`${t.events.toLocaleString()} exchanges`}
          icon={Coins}
          color="var(--teal)"
        />
        <StatCard
          label="Input tokens"
          value={Math.round(t.inputTokens).toLocaleString()}
          detail={`${t.events > 0 ? Math.round(t.inputTokens / t.events).toLocaleString() : "0"} avg per exchange`}
          icon={TrendingUp}
          color="var(--chart-1)"
        />
        <StatCard
          label="Output tokens"
          value={Math.round(t.outputTokens).toLocaleString()}
          detail={`${t.events > 0 ? Math.round(t.outputTokens / t.events).toLocaleString() : "0"} avg per exchange`}
          icon={Layers}
          color="var(--chart-3)"
        />
        <StatCard
          label="Avg tokens per exchange"
          value={Math.round(t.averageTokensPerEvent).toLocaleString()}
          detail={`${t.activeDays.toLocaleString()} active days`}
          icon={Hash}
          color="var(--chart-4)"
        />
      </>
    );
  }

  if (view === "prompts") {
    const avgPerDay = t.activeDays > 0 ? (t.events / t.activeDays).toFixed(1) : "0";
    return (
      <>
        <StatCard
          label="Total prompts"
          value={t.events.toLocaleString()}
          detail={`${t.activeDays.toLocaleString()} active days`}
          icon={Zap}
          color="var(--coral)"
        />
        <StatCard
          label="Avg prompts per day"
          value={avgPerDay}
          detail="Across active days only"
          icon={TrendingUp}
          color="var(--teal)"
        />
        <StatCard
          label="Total tokens used"
          value={Math.round(t.totalTokens).toLocaleString()}
          detail={`${Math.round(t.averageTokensPerEvent).toLocaleString()} avg per prompt`}
          icon={Coins}
          color="var(--chart-3)"
        />
        <StatCard
          label="Total cost"
          value={formatUsageCurrency(t.estimatedCostUsd)}
          detail={`${formatUsageCurrency(t.averageCostPerEvent)} avg per prompt`}
          icon={CircleDollarSign}
          color="var(--chart-4)"
        />
      </>
    );
  }

  // Default: cost view
  return (
    <>
      <StatCard
        label="Estimated cost"
        value={formatUsageCurrency(t.estimatedCostUsd)}
        detail={`${t.events.toLocaleString()} tracked exchanges`}
        icon={CircleDollarSign}
        color="var(--coral)"
      />
      <StatCard
        label="Total tokens"
        value={Math.round(t.totalTokens).toLocaleString()}
        detail={`${Math.round(t.averageTokensPerEvent).toLocaleString()} avg per exchange`}
        icon={Coins}
        color="var(--teal)"
      />
      <StatCard
        label="Input vs output"
        value={`${t.inputTokens.toLocaleString()} / ${t.outputTokens.toLocaleString()}`}
        detail={`${t.activeDays.toLocaleString()} active days`}
        icon={Layers}
        color="var(--chart-3)"
      />
      <StatCard
        label="Average cost"
        value={formatUsageCurrency(t.averageCostPerEvent)}
        detail="Average estimated cost per exchange"
        icon={TrendingUp}
        color="var(--chart-4)"
      />
    </>
  );
}

/* ── View-adaptive main chart ────────────────────────────── */

function ViewMainChart({ data, view }: { data: ChatUsageStatsResult; view: ViewMode }) {
  const viewConfig = getViewConfig(view);

  const dataKeySuffix = view === "tokens" ? "__tokens" : view === "prompts" ? "__events" : "";

  return (
    <ChartCard
      title={viewConfig.chartTitle}
      subtitle={viewConfig.chartSubtitle}
      icon={viewConfig.chartIcon}
      accentColor={viewConfig.chartAccent}
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.dailyUsage}>
            <defs>
              {data.dailyUsageModels.map((model, index) => (
                <linearGradient key={model} id={`fill-${view}-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={viewConfig.axisFormatter} />
            <RechartsTooltip
              formatter={(value, name) => [viewConfig.tooltipFormatter(toChartNumber(value as number | string)), name]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
            />
            <Legend />
            {data.dailyUsageModels.map((model, index) => (
              <Area
                key={model}
                type="monotone"
                dataKey={`${model}${dataKeySuffix}`}
                name={model}
                stackId="main"
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                fill={`url(#fill-${view}-${index})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ── View-adaptive model mix ─────────────────────────────── */

function ViewModelMix({ data, view }: { data: ChatUsageStatsResult; view: ViewMode }) {
  const viewConfig = getViewConfig(view);

  const pieDataKey = view === "tokens" ? "totalTokens" : view === "prompts" ? "events" : "estimatedCostUsd";
  const totalValue =
    view === "tokens" ? data.totals.totalTokens : view === "prompts" ? data.totals.events : data.totals.estimatedCostUsd;

  return (
    <ChartCard title="Model mix" subtitle={viewConfig.mixSubtitle} icon={Layers} accentColor="var(--chart-3)">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.modelBreakdown}
              dataKey={pieDataKey}
              nameKey="label"
              innerRadius={68}
              outerRadius={104}
              paddingAngle={3}
            >
              {data.modelBreakdown.map((entry, index) => (
                <Cell key={entry.model} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip formatter={(value) => viewConfig.tooltipFormatter(toChartNumber(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2">
        {data.modelBreakdown.map((item, index) => {
          const color = CHART_COLORS[index % CHART_COLORS.length];
          const itemValue = view === "tokens" ? item.totalTokens : view === "prompts" ? item.events : item.estimatedCostUsd;
          const share = totalValue > 0 ? Math.round((itemValue / totalValue) * 100) : 0;

          return (
            <div
              key={item.model}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm"
              style={{
                borderColor: `oklch(from ${color} l c h / 0.2)`,
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--ink-soft)]">{viewConfig.legendFormatter(itemValue)}</span>
                <span className="font-semibold" style={{ color }}>
                  {share}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

/* ── View config helper ──────────────────────────────────── */

function getViewConfig(view: ViewMode) {
  switch (view) {
    case "tokens":
      return {
        chartTitle: "Tokens over time",
        chartSubtitle: "Daily token consumption within the selected range, stacked by model.",
        chartIcon: Coins,
        chartAccent: "var(--teal)",
        mixSubtitle: "Token share by model in the selected range.",
        axisFormatter: formatAxisTokens,
        tooltipFormatter: (v: number) => Math.round(v).toLocaleString(),
        legendFormatter: (v: number) => Math.round(v).toLocaleString(),
      };
    case "prompts":
      return {
        chartTitle: "Prompts over time",
        chartSubtitle: "Daily prompt count within the selected range, stacked by model.",
        chartIcon: Zap,
        chartAccent: "var(--coral)",
        mixSubtitle: "Prompt share by model in the selected range.",
        axisFormatter: (v: number) => Math.round(v).toLocaleString(),
        tooltipFormatter: (v: number) => Math.round(v).toLocaleString(),
        legendFormatter: (v: number) => v.toLocaleString(),
      };
    default:
      return {
        chartTitle: "Estimated cost over time",
        chartSubtitle: "Daily spend within the selected range, stacked by model.",
        chartIcon: CircleDollarSign,
        chartAccent: "var(--coral)",
        mixSubtitle: "Cost share by model in the selected range.",
        axisFormatter: formatAxisCurrency,
        tooltipFormatter: (v: number) => formatUsageCurrency(v),
        legendFormatter: (v: number) => formatUsageCurrency(v),
      };
  }
}

/* ── Shared helpers ──────────────────────────────────────── */

function TrackedField(props: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] px-3 py-2.5">
      <p className="font-medium text-[var(--teal)]">{props.label}</p>
      <p className="mt-1">{props.value}</p>
    </div>
  );
}

function formatAxisCurrency(value: number) {
  if (value >= 1) return `$${value.toFixed(0)}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

function formatAxisTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${Math.round(value)}`;
}

function toChartNumber(value: number | string | ReadonlyArray<number | string> | undefined) {
  if (Array.isArray(value)) return toChartNumber(value[0]);
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}
