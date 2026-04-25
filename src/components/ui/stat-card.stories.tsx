import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleDollarSign, Coins, Layers, TrendingUp, Users } from "lucide-react";
import { StatCard } from "./stat-card";

const meta = {
  title: "Design System/Data Display/Stat Card",
  tags: ["autodocs"],
  component: StatCard,
  argTypes: {
    color: { control: "text" },
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Purple: Story = {
  args: {
    label: "Estimated cost",
    value: "$4.27",
    detail: "138 tracked exchanges",
    icon: CircleDollarSign,
    color: "var(--chart-2)",
  },
};

export const Accent: Story = {
  args: {
    label: "Total tokens",
    value: "1,284,390",
    detail: "9,306 avg per exchange",
    icon: Coins,
    color: "var(--accent)",
  },
};

export const Blue: Story = {
  args: {
    label: "Input vs output",
    value: "890,210 / 394,180",
    detail: "12 active days",
    icon: Layers,
    color: "var(--chart-3)",
  },
};

export const Amber: Story = {
  args: {
    label: "Average cost",
    value: "$0.031",
    detail: "Average estimated cost per exchange",
    icon: TrendingUp,
    color: "var(--chart-4)",
  },
};

export const Grid: Story = {
  args: {
    label: "Estimated cost",
    value: "$4.27",
    detail: "138 tracked exchanges",
    icon: CircleDollarSign,
    color: "var(--chart-2)",
  },
  render: () => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Estimated cost"
        value="$4.27"
        detail="138 tracked exchanges"
        icon={CircleDollarSign}
        color="var(--chart-2)"
      />
      <StatCard label="Total tokens" value="1,284,390" detail="9,306 avg per exchange" icon={Coins} color="var(--accent)" />
      <StatCard label="Active users" value="3" detail="Last 30 days" icon={Users} color="var(--chart-3)" />
      <StatCard label="Average cost" value="$0.031" detail="Per exchange" icon={TrendingUp} color="var(--chart-4)" />
    </div>
  ),
};
