import dayjs from "dayjs";
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, isChatModel } from "#/lib/chat";

export type UsageSearchInput = {
	from?: string;
	to?: string;
	model?: string;
};

export function normalizeUsageSearch(input: UsageSearchInput) {
	const model = input.model && isChatModel(input.model) ? input.model : "all";

	const from = normalizeDateInput(input.from);
	const to = normalizeDateInput(input.to);

	if (from && to && dayjs(from).isAfter(dayjs(to))) {
		return { model, from: to, to: from };
	}

	return { model, from, to };
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
