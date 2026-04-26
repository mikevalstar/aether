import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, Filter, MoreHorizontal, Upload, X } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableProps } from "./data-table";

// The DataTable is generic; cast through unknown so Storybook controls work without
// losing the strong typing on each story's args.
const TypedDataTable = DataTable as <T>(p: DataTableProps<T>) => React.ReactElement;

const meta: Meta<DataTableProps<Run>> = {
  title: "Design System/Data Display/Data Table",
  tags: ["autodocs"],
  component: TypedDataTable as never,
};

export default meta;
type Story = StoryObj<DataTableProps<Run>>;

type Run = {
  id: string;
  workflow: string;
  detail: string;
  trigger: string;
  duration: string;
  cost: string;
  status: "success" | "running" | "error" | "pending";
};

const runs: Run[] = [
  {
    id: "0142",
    workflow: "Recipe Formatter",
    detail: "gnocchi al pesto",
    trigger: "manual · vince",
    duration: "12.4s",
    cost: "$0.012",
    status: "success",
  },
  {
    id: "0141",
    workflow: "Daily Digest",
    detail: "7 sources",
    trigger: "cron · 07:00",
    duration: "01:24",
    cost: "$0.084",
    status: "running",
  },
  {
    id: "0140",
    workflow: "Add AI Skill",
    detail: "rust async patterns",
    trigger: "chat · /skill",
    duration: "8.1s",
    cost: "$0.008",
    status: "success",
  },
  {
    id: "0139",
    workflow: "PR Reviewer",
    detail: "paperclip#412",
    trigger: "webhook · github",
    duration: "—",
    cost: "$0.000",
    status: "error",
  },
  {
    id: "0138",
    workflow: "Meeting Notes",
    detail: "eng standup transcript",
    trigger: "file · drop folder",
    duration: "00:38",
    cost: "$0.041",
    status: "success",
  },
  {
    id: "0137",
    workflow: "Bookmark Triage",
    detail: "pending",
    trigger: "cron · sun 09:00",
    duration: "—",
    cost: "—",
    status: "pending",
  },
];

function StatusBadge({ status }: { status: Run["status"] }) {
  const base = "inline-flex size-6 items-center justify-center rounded-[3px] border text-[var(--ink-soft)]";
  if (status === "success") {
    return (
      <span className={`${base} border-[var(--success)]/40 bg-[var(--success-subtle)] text-[var(--success)]`}>
        <Check className="size-3.5" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className={`${base} border-[var(--destructive)]/40 bg-[var(--destructive-subtle)] text-[var(--destructive)]`}>
        <X className="size-3.5" />
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className={`${base} border-[var(--warning)]/40 bg-[var(--warning-subtle)] text-[var(--warning)]`}>
        <span className="size-1.5 rounded-full bg-current" />
      </span>
    );
  }
  return (
    <span className={`${base} border-[var(--line-strong)] text-[var(--ink-faint)]`}>
      <MoreHorizontal className="size-3.5" />
    </span>
  );
}

const columns: DataTableColumn<Run>[] = [
  {
    key: "id",
    header: "Run",
    cell: (row) => <span className="font-mono text-xs text-[var(--ink-faint)]">#{row.id}</span>,
  },
  {
    key: "workflow",
    header: "Workflow",
    cell: (row) => (
      <>
        <span className="font-semibold text-[var(--ink)]">{row.workflow}</span>
        <span className="text-[var(--ink-soft)]"> · {row.detail}</span>
      </>
    ),
  },
  {
    key: "trigger",
    header: "Trigger",
    cell: (row) => <span className="text-[var(--ink-soft)]">{row.trigger}</span>,
  },
  {
    key: "duration",
    header: "Duration",
    cell: (row) => <span className="tabular-nums text-[var(--ink)]">{row.duration}</span>,
  },
  {
    key: "cost",
    align: "right",
    header: "Cost",
    cell: (row) => <span className="tabular-nums text-[var(--ink)]">{row.cost}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusBadge status={row.status} />,
  },
];

export const RecentRuns: Story = {
  args: {
    title: "Recent runs",
    count: runs.length,
    data: runs,
    columns,
    rowKey: (row) => row.id,
    showChevron: true,
    onRowClick: (row) => console.log("clicked", row.id),
    actions: [
      { label: "Filter", icon: Filter },
      { label: "Export", icon: Upload },
    ],
  },
  render: (args) => (
    <div className="mx-auto max-w-5xl p-6">
      <DataTable {...args} />
    </div>
  ),
};

export const NoHeader: Story = {
  args: {
    data: runs,
    columns,
    rowKey: (row) => row.id,
    showChevron: true,
    onRowClick: (row) => console.log("clicked", row.id),
  },
  render: (args) => (
    <div className="mx-auto max-w-5xl p-6">
      <DataTable {...args} />
    </div>
  ),
};

export const TitleOnly: Story = {
  args: {
    title: "Tasks",
    data: runs.slice(0, 3),
    columns,
    rowKey: (row) => row.id,
  },
  render: (args) => (
    <div className="mx-auto max-w-5xl p-6">
      <DataTable {...args} />
    </div>
  ),
};

export const CustomHeaderRight: Story = {
  args: {
    title: "Workflows",
    count: 12,
    data: runs.slice(0, 4),
    columns,
    rowKey: (row) => row.id,
    showChevron: true,
    onRowClick: (row) => console.log("clicked", row.id),
    headerRight: <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Updated 2m ago</span>,
  },
  render: (args) => (
    <div className="mx-auto max-w-5xl p-6">
      <DataTable {...args} />
    </div>
  ),
};

export const Empty: Story = {
  args: {
    title: "Recent runs",
    count: 0,
    data: [],
    columns,
    rowKey: (row) => row.id,
    empty: "No runs yet — trigger a workflow to see it here.",
    actions: [{ label: "Filter", icon: Filter }],
  },
  render: (args) => (
    <div className="mx-auto max-w-5xl p-6">
      <DataTable {...args} />
    </div>
  ),
};
