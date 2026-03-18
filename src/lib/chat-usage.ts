import dayjs from "dayjs";
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, isChatModel } from "#/lib/chat";

export const TASK_TYPES = ["chat", "title"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export function isTaskType(value: string): value is TaskType {
  return TASK_TYPES.includes(value as TaskType);
}

export function getTaskTypeLabel(taskType: string): string {
  switch (taskType) {
    case "chat":
      return "Chat";
    case "title":
      return "Title generation";
    default:
      return taskType;
  }
}

export type UsageSearchInput = {
  from?: string;
  to?: string;
  model?: string;
  taskType?: string;
};

export function normalizeUsageSearch(input: UsageSearchInput) {
  const model = input.model && isChatModel(input.model) ? input.model : "all";
  const taskType = input.taskType && isTaskType(input.taskType) ? input.taskType : "all";

  const from = normalizeDateInput(input.from);
  const to = normalizeDateInput(input.to);

  if (from && to && dayjs(from).isAfter(dayjs(to))) {
    return { model, taskType, from: to, to: from };
  }

  return { model, taskType, from, to };
}

export function buildUsageDateRange(search: ReturnType<typeof normalizeUsageSearch>) {
  return {
    fromDate: search.from ? dayjs(`${search.from}T00:00:00`).toDate() : undefined,
    toDateExclusive: search.to ? dayjs(`${search.to}T00:00:00`).add(1, "day").toDate() : undefined,
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
    (isChatModel(model) ? CHAT_MODELS.find((item) => item.id === model)?.label : model) ??
    DEFAULT_CHAT_MODEL
  );
}

function normalizeDateInput(value: string | undefined) {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
