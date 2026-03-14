import dayjs from "dayjs";
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, isChatModel } from "#/lib/chat";

export const USAGE_RANGE_PRESETS = [
	{ id: "7d", label: "Last 7 days", days: 7 },
	{ id: "30d", label: "Last 30 days", days: 30 },
	{ id: "90d", label: "Last 90 days", days: 90 },
	{ id: "month", label: "Month to date" },
	{ id: "all", label: "All time" },
] as const;

export type UsageRangePreset = (typeof USAGE_RANGE_PRESETS)[number]["id"];

export type UsageSearchInput = {
	from?: string;
	to?: string;
	preset?: string;
	model?: string;
};

export function isUsageRangePreset(value: string): value is UsageRangePreset {
	return USAGE_RANGE_PRESETS.some((preset) => preset.id === value);
}

export function normalizeUsageSearch(input: UsageSearchInput) {
	const preset =
		input.preset && isUsageRangePreset(input.preset) ? input.preset : "30d";
	const model = input.model && isChatModel(input.model) ? input.model : "all";
	const today = dayjs().startOf("day");

	let from = normalizeDateInput(input.from);
	let to = normalizeDateInput(input.to);

	if (!from && !to) {
		if (preset === "month") {
			from = today.startOf("month").format("YYYY-MM-DD");
			to = today.format("YYYY-MM-DD");
		} else if (preset !== "all") {
			const days =
				USAGE_RANGE_PRESETS.find(
					(
						item,
					): item is (typeof USAGE_RANGE_PRESETS)[number] & { days: number } =>
						item.id === preset && "days" in item,
				)?.days ?? 30;
			from = today.subtract(days - 1, "day").format("YYYY-MM-DD");
			to = today.format("YYYY-MM-DD");
		}
	}

	if (from && to && dayjs(from).isAfter(dayjs(to))) {
		return {
			preset,
			model,
			from: to,
			to: from,
		};
	}

	return { preset, model, from, to };
}

export function buildUsageDateRange(
	search: ReturnType<typeof normalizeUsageSearch>,
) {
	return {
		fromDate: search.from
			? dayjs(`${search.from}T00:00:00`).toDate()
			: undefined,
		toDateExclusive: search.to
			? dayjs(`${search.to}T00:00:00`).add(1, "day").toDate()
			: undefined,
	};
}

export function formatUsageCurrency(value: number) {
	if (value > 0 && value < 0.0001) return "<$0.0001";

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: value < 1 ? 4 : 2,
		maximumFractionDigits: value < 1 ? 4 : 2,
	}).format(value);
}

export function getChatModelLabel(model: string) {
	return (
		CHAT_MODELS.find((item) => item.id === model)?.label ??
		(isChatModel(model)
			? CHAT_MODELS.find((item) => item.id === model)?.label
			: model) ??
		DEFAULT_CHAT_MODEL
	);
}

function normalizeDateInput(value: string | undefined) {
	if (!value) return undefined;
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
