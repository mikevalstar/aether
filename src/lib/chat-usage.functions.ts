import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import {
	buildUsageDateRange,
	getChatModelLabel,
	normalizeUsageSearch,
	type UsageSearchInput,
} from "#/lib/chat-usage";

type DailyUsagePoint = {
	date: string;
	label: string;
	estimatedCostUsd: number;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	events: number;
};

type ModelBreakdownPoint = {
	model: string;
	label: string;
	estimatedCostUsd: number;
	totalTokens: number;
	inputTokens: number;
	outputTokens: number;
	events: number;
	shareOfCost: number;
};

export type ChatUsageStatsResult = {
	search: { from?: string; to?: string; model: string };
	totals: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
		estimatedCostUsd: number;
		events: number;
		averageCostPerEvent: number;
		averageTokensPerEvent: number;
		activeDays: number;
	};
	dailyUsage: DailyUsagePoint[];
	modelBreakdown: ModelBreakdownPoint[];
	recentEvents: Array<{
		id: string;
		createdAt: string;
		model: string;
		modelLabel: string;
		threadId: string | null;
		threadTitle: string | null;
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
		estimatedCostUsd: number;
	}>;
	availableModels: Array<{
		id: string;
		label: string;
	}>;
	dateBounds: {
		firstEventAt: string | null;
		lastEventAt: string | null;
	};
};

export const getChatUsageStats = createServerFn({ method: "GET" })
	.inputValidator((data: UsageSearchInput) => data)
	.handler(async ({ data }): Promise<ChatUsageStatsResult> => {
		const session = await ensureSession();
		const search = normalizeUsageSearch(data);
		const { fromDate, toDateExclusive } = buildUsageDateRange(search);

		const events = await prisma.chatUsageEvent.findMany({
			where: {
				userId: session.user.id,
				model: search.model === "all" ? undefined : search.model,
				createdAt: {
					gte: fromDate,
					lt: toDateExclusive,
				},
			},
			orderBy: { createdAt: "asc" },
		});

		const threadIds: string[] = [
			...new Set(
				events
					.map((event) => event.threadId)
					.filter((threadId): threadId is string => Boolean(threadId)),
			),
		];
		const threads = threadIds.length
			? await prisma.chatThread.findMany({
					where: {
						userId: session.user.id,
						id: { in: threadIds },
					},
					select: { id: true, title: true },
				})
			: [];
		const threadTitleById = new Map(
			threads.map((thread) => [thread.id, thread.title]),
		);

		const totals = events.reduce(
			(acc, event) => ({
				inputTokens: acc.inputTokens + event.inputTokens,
				outputTokens: acc.outputTokens + event.outputTokens,
				totalTokens: acc.totalTokens + event.totalTokens,
				estimatedCostUsd: acc.estimatedCostUsd + event.estimatedCostUsd,
				events: acc.events + 1,
			}),
			{
				inputTokens: 0,
				outputTokens: 0,
				totalTokens: 0,
				estimatedCostUsd: 0,
				events: 0,
			},
		);

		const dailyUsageMap = new Map<string, DailyUsagePoint>();
		const modelBreakdownMap = new Map<string, ModelBreakdownPoint>();

		for (const event of events) {
			const date = dayjs(event.createdAt).format("YYYY-MM-DD");
			const existingDay = dailyUsageMap.get(date) ?? {
				date,
				label: dayjs(event.createdAt).format("MMM D"),
				estimatedCostUsd: 0,
				inputTokens: 0,
				outputTokens: 0,
				totalTokens: 0,
				events: 0,
			};

			existingDay.estimatedCostUsd += event.estimatedCostUsd;
			existingDay.inputTokens += event.inputTokens;
			existingDay.outputTokens += event.outputTokens;
			existingDay.totalTokens += event.totalTokens;
			existingDay.events += 1;
			dailyUsageMap.set(date, existingDay);

			const existingModel = modelBreakdownMap.get(event.model) ?? {
				model: event.model,
				label: getChatModelLabel(event.model),
				estimatedCostUsd: 0,
				totalTokens: 0,
				inputTokens: 0,
				outputTokens: 0,
				events: 0,
				shareOfCost: 0,
			};

			existingModel.estimatedCostUsd += event.estimatedCostUsd;
			existingModel.totalTokens += event.totalTokens;
			existingModel.inputTokens += event.inputTokens;
			existingModel.outputTokens += event.outputTokens;
			existingModel.events += 1;
			modelBreakdownMap.set(event.model, existingModel);
		}

		const dailyUsage = [...dailyUsageMap.values()];
		const modelBreakdown = [...modelBreakdownMap.values()]
			.map((item) => ({
				...item,
				shareOfCost:
					totals.estimatedCostUsd > 0
						? item.estimatedCostUsd / totals.estimatedCostUsd
						: 0,
			}))
			.sort((left, right) => right.estimatedCostUsd - left.estimatedCostUsd);

		const recentEvents = [...events]
			.reverse()
			.slice(0, 10)
			.map((event) => ({
				id: event.id,
				createdAt: event.createdAt.toISOString(),
				model: event.model,
				modelLabel: getChatModelLabel(event.model),
				threadId: event.threadId,
				threadTitle: event.threadId
					? (threadTitleById.get(event.threadId) ?? "Deleted thread")
					: null,
				inputTokens: event.inputTokens,
				outputTokens: event.outputTokens,
				totalTokens: event.totalTokens,
				estimatedCostUsd: event.estimatedCostUsd,
			}));

		return {
			search,
			totals: {
				...totals,
				averageCostPerEvent:
					totals.events > 0 ? totals.estimatedCostUsd / totals.events : 0,
				averageTokensPerEvent:
					totals.events > 0 ? totals.totalTokens / totals.events : 0,
				activeDays: dailyUsage.length,
			},
			dailyUsage,
			modelBreakdown,
			recentEvents,
			availableModels: modelBreakdown.map((item) => ({
				id: item.model,
				label: item.label,
			})),
			dateBounds: {
				firstEventAt: events[0]?.createdAt.toISOString() ?? null,
				lastEventAt: events.at(-1)?.createdAt.toISOString() ?? null,
			},
		};
	});
