import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ChartLine, CircleDollarSign, Coins, Hash, Layers, MessageSquare, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { ChartCard } from "#/components/ui/chart-card";
import { DateRangePicker } from "#/components/ui/date-range-picker";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { StatCard } from "#/components/ui/stat-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { getSession } from "#/lib/auth.functions";
import { formatUsageCurrency, getTaskTypeLabel, normalizeUsageSearch, TASK_TYPES } from "#/lib/chat-usage";
import { type ChatUsageStatsResult, getChatUsageStats } from "#/lib/chat-usage.functions";
import { formatDateTime } from "#/lib/date";

const usageSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  model: z.string().optional(),
  taskType: z.string().optional(),
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
    return await getChatUsageStats({ data: deps });
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
  };
  const search = normalizeUsageSearch(rawSearch);

  const hasData = data.totals.events > 0;

  function updateSearch(next: { from?: string; to?: string; model?: string; taskType?: string }) {
    void navigate({
      search: {
        from: next.from,
        to: next.to,
        model: next.model,
        taskType: next.taskType,
      },
      replace: true,
    });
  }

  return (
    <main className="relative overflow-hidden">
      <GlowBg color="var(--coral)" size="size-[500px]" position="-right-48 -top-48" />
      <GlowBg color="var(--teal)" size="size-[350px]" position="-left-36 top-96" />

      <div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
        <section className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel icon={ChartLine} color="text-[var(--coral)]">
              Usage
            </SectionLabel>
            <h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Chat cost <span className="text-[var(--coral)]">stats</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Track estimated spend, token volume, and model mix across every completed chat exchange.
            </p>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link to="/chat">
              <MessageSquare className="size-3.5" />
              Open chat
            </Link>
          </Button>
        </section>

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

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Estimated cost"
            value={formatUsageCurrency(data.totals.estimatedCostUsd)}
            detail={`${data.totals.events.toLocaleString()} tracked exchanges`}
            icon={CircleDollarSign}
            color="var(--coral)"
          />
          <StatCard
            label="Total tokens"
            value={Math.round(data.totals.totalTokens).toLocaleString()}
            detail={`${Math.round(data.totals.averageTokensPerEvent).toLocaleString()} avg per exchange`}
            icon={Coins}
            color="var(--teal)"
          />
          <StatCard
            label="Input vs output"
            value={`${data.totals.inputTokens.toLocaleString()} / ${data.totals.outputTokens.toLocaleString()}`}
            detail={`${data.totals.activeDays.toLocaleString()} active days`}
            icon={Layers}
            color="var(--chart-3)"
          />
          <StatCard
            label="Average cost"
            value={formatUsageCurrency(data.totals.averageCostPerEvent)}
            detail="Average estimated cost per exchange"
            icon={TrendingUp}
            color="var(--chart-4)"
          />
        </section>

        {hasData ? (
          <>
            <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
              <ChartCard
                title="Estimated cost over time"
                subtitle="Daily spend within the selected range, stacked by model."
                icon={CircleDollarSign}
                accentColor="var(--coral)"
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.dailyUsage}>
                      <defs>
                        {data.dailyUsageModels.map((model, index) => (
                          <linearGradient key={model} id={`costFill-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.32} />
                            <stop offset="95%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatAxisCurrency(value)} />
                      <RechartsTooltip
                        formatter={(value, name) => [formatUsageCurrency(toChartNumber(value as number | string)), name]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                      />
                      <Legend />
                      {data.dailyUsageModels.map((model, index) => (
                        <Area
                          key={model}
                          type="monotone"
                          dataKey={model}
                          stackId="cost"
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          fill={`url(#costFill-${index})`}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Model mix"
                subtitle="Cost share by model in the selected range."
                icon={Layers}
                accentColor="var(--chart-3)"
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.modelBreakdown}
                        dataKey="estimatedCostUsd"
                        nameKey="label"
                        innerRadius={68}
                        outerRadius={104}
                        paddingAngle={3}
                      >
                        {data.modelBreakdown.map((entry, index) => (
                          <Cell key={entry.model} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatUsageCurrency(toChartNumber(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2">
                  {data.modelBreakdown.map((item, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
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
                          <span className="text-muted-foreground">{formatUsageCurrency(item.estimatedCostUsd)}</span>
                          <span className="font-semibold" style={{ color }}>
                            {Math.round(item.shareOfCost * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </section>

            <section className="mb-6">
              <ChartCard
                title="Daily token flow"
                subtitle="Input and output tokens by day."
                icon={Coins}
                accentColor="var(--teal)"
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyUsage}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatAxisTokens(value)} />
                      <RechartsTooltip
                        formatter={(value) => Math.round(toChartNumber(value)).toLocaleString()}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                      />
                      <Bar dataKey="inputTokens" stackId="tokens" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outputTokens" stackId="tokens" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
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
                      className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-[var(--ink-soft)]">
                          <span>{formatDateTime(event.createdAt)}</span>
                          <span className="text-[var(--ink)]">{event.modelLabel}</span>
                          <Badge variant="outline">{getTaskTypeLabel(event.taskType)}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
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
                          <span className="font-medium text-[var(--ink)]">
                            {formatUsageCurrency(event.estimatedCostUsd)}
                          </span>
                        </div>
                      </div>
                      {event.threadTitle && (
                        <div className="mt-1 truncate text-xs text-[var(--ink-soft)]">
                          {event.threadId ? (
                            <Link
                              to="/chat"
                              search={{ threadId: event.threadId }}
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
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
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
      </div>
    </main>
  );
}

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
