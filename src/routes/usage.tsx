import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { getSession } from "#/lib/auth.functions";
import {
	formatUsageCurrency,
	normalizeUsageSearch,
	USAGE_RANGE_PRESETS,
} from "#/lib/chat-usage";
import {
	type ChatUsageStatsResult,
	getChatUsageStats,
} from "#/lib/chat-usage.functions";

const usageSearchSchema = z.object({
	preset: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	model: z.string().optional(),
});

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

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
		preset?: string;
		from?: string;
		to?: string;
		model?: string;
	};
	const search = normalizeUsageSearch(rawSearch);

	const hasData = data.totals.events > 0;

	function updateSearch(next: {
		preset?: string;
		from?: string;
		to?: string;
		model?: string;
	}) {
		void navigate({
			search: {
				preset: next.preset,
				from: next.from,
				to: next.to,
				model: next.model,
			},
			replace: true,
		});
	}

	return (
		<main className="page-wrap px-4 pb-12 pt-10">
			<section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--teal)]">
						Usage
					</p>
					<h1 className="display-title text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
						Chat cost stats
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
						Track estimated spend, token volume, and model mix across every
						completed chat exchange.
					</p>
				</div>

				<Button asChild variant="outline">
					<Link to="/chat">Open chat</Link>
				</Button>
			</section>

			<section className="surface-card mb-6 p-4 sm:p-5">
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap gap-2">
						{USAGE_RANGE_PRESETS.map((preset) => {
							const isActive =
								search.preset === preset.id && !rawSearch.from && !rawSearch.to;

							return (
								<Button
									key={preset.id}
									type="button"
									variant={isActive ? "default" : "outline"}
									size="sm"
									onClick={() => {
										updateSearch({
											preset: preset.id,
											from: undefined,
											to: undefined,
											model: search.model,
										});
									}}
								>
									{preset.label}
								</Button>
							);
						})}
					</div>

					<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
						<div>
							<p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
								From
							</p>
							<Input
								type="date"
								value={search.from ?? ""}
								onChange={(event) => {
									updateSearch({
										preset: undefined,
										from: event.target.value || undefined,
										to: search.to,
										model: search.model,
									});
								}}
							/>
						</div>
						<div>
							<p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
								To
							</p>
							<Input
								type="date"
								value={search.to ?? ""}
								onChange={(event) => {
									updateSearch({
										preset: undefined,
										from: search.from,
										to: event.target.value || undefined,
										model: search.model,
									});
								}}
							/>
						</div>
						<div>
							<p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
								Model
							</p>
							<Select
								value={search.model}
								onValueChange={(value) => {
									updateSearch({
										preset: search.preset,
										from: search.from,
										to: search.to,
										model: value,
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
					</div>
				</div>
			</section>

			<section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Estimated cost"
					value={formatUsageCurrency(data.totals.estimatedCostUsd)}
					detail={`${data.totals.events.toLocaleString()} tracked exchanges`}
				/>
				<StatCard
					label="Total tokens"
					value={Math.round(data.totals.totalTokens).toLocaleString()}
					detail={`${Math.round(data.totals.averageTokensPerEvent).toLocaleString()} avg per exchange`}
				/>
				<StatCard
					label="Input vs output"
					value={`${data.totals.inputTokens.toLocaleString()} / ${data.totals.outputTokens.toLocaleString()}`}
					detail={`${data.totals.activeDays.toLocaleString()} active days`}
				/>
				<StatCard
					label="Average cost"
					value={formatUsageCurrency(data.totals.averageCostPerEvent)}
					detail="Average estimated cost per exchange"
				/>
			</section>

			{hasData ? (
				<>
					<section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
						<ChartCard
							title="Estimated cost over time"
							subtitle="Daily spend within the selected range."
						>
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={data.dailyUsage}>
										<defs>
											<linearGradient
												id="usageCostFill"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="var(--chart-2)"
													stopOpacity={0.32}
												/>
												<stop
													offset="95%"
													stopColor="var(--chart-2)"
													stopOpacity={0.02}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid stroke="var(--line)" vertical={false} />
										<XAxis dataKey="label" tickLine={false} axisLine={false} />
										<YAxis
											tickLine={false}
											axisLine={false}
											tickFormatter={(value) => formatAxisCurrency(value)}
										/>
										<Tooltip
											formatter={(value) =>
												formatUsageCurrency(toChartNumber(value))
											}
											labelFormatter={(_, payload) =>
												payload?.[0]?.payload?.date ?? ""
											}
										/>
										<Area
											type="monotone"
											dataKey="estimatedCostUsd"
											stroke="var(--chart-2)"
											fill="url(#usageCostFill)"
											strokeWidth={2.5}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</ChartCard>

						<ChartCard
							title="Model mix"
							subtitle="Cost share by model in the selected range."
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
												<Cell
													key={entry.model}
													fill={CHART_COLORS[index % CHART_COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip
											formatter={(value) =>
												formatUsageCurrency(toChartNumber(value))
											}
										/>
									</PieChart>
								</ResponsiveContainer>
							</div>
							<div className="grid gap-2">
								{data.modelBreakdown.map((item, index) => (
									<div
										key={item.model}
										className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] px-3 py-2 text-sm"
									>
										<div className="flex min-w-0 items-center gap-2">
											<span
												className="size-2.5 rounded-full"
												style={{
													backgroundColor:
														CHART_COLORS[index % CHART_COLORS.length],
												}}
											/>
											<span className="truncate text-[var(--ink)]">
												{item.label}
											</span>
										</div>
										<span className="text-[var(--ink-soft)]">
											{Math.round(item.shareOfCost * 100)}%
										</span>
									</div>
								))}
							</div>
						</ChartCard>
					</section>

					<section className="mb-6">
						<ChartCard
							title="Daily token flow"
							subtitle="Input and output tokens by day."
						>
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.dailyUsage}>
										<CartesianGrid stroke="var(--line)" vertical={false} />
										<XAxis dataKey="label" tickLine={false} axisLine={false} />
										<YAxis
											tickLine={false}
											axisLine={false}
											tickFormatter={(value) => formatAxisTokens(value)}
										/>
										<Tooltip
											formatter={(value) =>
												Math.round(toChartNumber(value)).toLocaleString()
											}
											labelFormatter={(_, payload) =>
												payload?.[0]?.payload?.date ?? ""
											}
										/>
										<Bar
											dataKey="inputTokens"
											stackId="tokens"
											fill="var(--chart-1)"
											radius={[4, 4, 0, 0]}
										/>
										<Bar
											dataKey="outputTokens"
											stackId="tokens"
											fill="var(--chart-3)"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</ChartCard>
					</section>

					<section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
						<ChartCard
							title="Recent exchanges"
							subtitle="Latest tracked chat completions in this view."
						>
							<div className="overflow-x-auto">
								<table className="min-w-full border-separate border-spacing-y-2 text-sm">
									<thead>
										<tr className="text-left text-[var(--ink-soft)]">
											<th className="pb-1 font-medium">When</th>
											<th className="pb-1 font-medium">Model</th>
											<th className="pb-1 font-medium">Thread</th>
											<th className="pb-1 text-right font-medium">Tokens</th>
											<th className="pb-1 text-right font-medium">Cost</th>
										</tr>
									</thead>
									<tbody>
										{data.recentEvents.map((event) => (
											<tr
												key={event.id}
												className="rounded-lg bg-[var(--bg)] text-[var(--ink)]"
											>
												<td className="rounded-l-lg px-3 py-2.5 text-[var(--ink-soft)]">
													{new Date(event.createdAt).toLocaleString()}
												</td>
												<td className="px-3 py-2.5">{event.modelLabel}</td>
												<td className="px-3 py-2.5 text-[var(--ink-soft)]">
													{event.threadTitle ?? "-"}
												</td>
												<td className="px-3 py-2.5 text-right">
													{event.totalTokens.toLocaleString()}
												</td>
												<td className="rounded-r-lg px-3 py-2.5 text-right">
													{formatUsageCurrency(event.estimatedCostUsd)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</ChartCard>

						<ChartCard
							title="What gets tracked"
							subtitle="Saved per completed assistant response."
						>
							<div className="grid gap-2 text-sm text-[var(--ink-soft)]">
								<TrackedField label="User" value="Owner of the usage event" />
								<TrackedField
									label="Thread"
									value="Optional chat thread id for drill-down"
								/>
								<TrackedField
									label="Model"
									value="Claude model used for the exchange"
								/>
								<TrackedField
									label="Tokens"
									value="Input, output, and total token counts"
								/>
								<TrackedField
									label="Cost"
									value="Estimated USD based on model pricing"
								/>
								<TrackedField
									label="Time"
									value="Timestamp recorded when the exchange finishes"
								/>
							</div>
						</ChartCard>
					</section>
				</>
			) : (
				<section className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
					<h2 className="text-lg font-semibold text-[var(--ink)]">
						No usage data yet
					</h2>
					<p className="mt-2 max-w-md text-sm text-[var(--ink-soft)]">
						Start chatting and completed responses will appear here with costs,
						tokens, and model trends.
					</p>
					<Button asChild className="mt-5">
						<Link to="/chat">Start a chat</Link>
					</Button>
				</section>
			)}
		</main>
	);
}

function StatCard(props: { label: string; value: string; detail: string }) {
	return (
		<article className="surface-card p-5">
			<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
				{props.label}
			</p>
			<p className="mt-3 text-2xl font-semibold text-[var(--ink)]">
				{props.value}
			</p>
			<p className="mt-2 text-sm text-[var(--ink-soft)]">{props.detail}</p>
		</article>
	);
}

function ChartCard(props: {
	title: string;
	subtitle: string;
	children: ReactNode;
}) {
	return (
		<section className="surface-card p-5">
			<div className="mb-4">
				<h2 className="text-base font-semibold text-[var(--ink)]">
					{props.title}
				</h2>
				<p className="mt-1 text-sm text-[var(--ink-soft)]">{props.subtitle}</p>
			</div>
			{props.children}
		</section>
	);
}

function TrackedField(props: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-[var(--line)] px-3 py-2.5">
			<p className="font-medium text-[var(--ink)]">{props.label}</p>
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

function toChartNumber(
	value: number | string | ReadonlyArray<number | string> | undefined,
) {
	if (Array.isArray(value)) return toChartNumber(value[0]);
	if (typeof value === "number") return value;
	if (typeof value === "string") return Number(value) || 0;
	return 0;
}
