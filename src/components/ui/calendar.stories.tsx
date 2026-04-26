import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Calendar } from "./calendar";

const meta = {
  title: "Design System/Forms/Calendar",
  tags: ["autodocs"],
  component: Calendar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />;
  },
};

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>({
      from: new Date(),
      to: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });
    return <Calendar mode="range" selected={range as never} onSelect={setRange as never} className="rounded-md border" />;
  },
};
