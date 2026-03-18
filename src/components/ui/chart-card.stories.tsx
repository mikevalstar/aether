import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChartLine, CircleDollarSign, Hash, Layers, MessageSquare } from "lucide-react";
import { ChartCard } from "./chart-card";

const meta = {
  title: "Design System/Data Display/Chart Card",
  tags: ["autodocs"],
  component: ChartCard,
  argTypes: {
    accentColor: { control: "text" },
  },
} satisfies Meta<typeof ChartCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcon: Story = {
  args: {
    title: "Estimated cost over time",
    subtitle: "Daily spend within the selected range.",
    icon: CircleDollarSign,
    accentColor: "var(--coral)",
  },
  render: (args) => (
    <ChartCard {...args}>
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-sm text-muted-foreground">
        Chart placeholder
      </div>
    </ChartCard>
  ),
};

export const TealAccent: Story = {
  args: {
    title: "Daily token flow",
    subtitle: "Input and output tokens by day.",
    icon: ChartLine,
    accentColor: "var(--teal)",
  },
  render: (args) => (
    <ChartCard {...args}>
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-sm text-muted-foreground">
        Chart placeholder
      </div>
    </ChartCard>
  ),
};

export const NoIcon: Story = {
  args: {
    title: "Simple card",
    subtitle: "Without an icon badge, the card falls back to a clean header.",
  },
  render: (args) => (
    <ChartCard {...args}>
      <p className="text-sm text-muted-foreground">Any content can go here — tables, charts, lists.</p>
    </ChartCard>
  ),
};

export const Grid: Story = {
  args: {
    title: "Cost over time",
    subtitle: "Daily spend.",
    icon: CircleDollarSign,
    accentColor: "var(--coral)",
  },
  render: () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Cost over time"
        subtitle="Daily spend within the selected range."
        icon={CircleDollarSign}
        accentColor="var(--coral)"
      >
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-sm text-muted-foreground">
          Area chart
        </div>
      </ChartCard>
      <ChartCard title="Model mix" subtitle="Cost share by model." icon={Layers} accentColor="var(--chart-3)">
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-sm text-muted-foreground">
          Pie chart
        </div>
      </ChartCard>
      <ChartCard
        title="Recent exchanges"
        subtitle="Latest tracked completions."
        icon={MessageSquare}
        accentColor="var(--coral)"
      >
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-sm text-muted-foreground">
          Table
        </div>
      </ChartCard>
      <ChartCard title="What gets tracked" subtitle="Fields saved per response." icon={Hash} accentColor="var(--chart-4)">
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-sm text-muted-foreground">
          Field list
        </div>
      </ChartCard>
    </div>
  ),
};
