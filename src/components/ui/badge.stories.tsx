import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, X } from "lucide-react";
import { Badge } from "./badge";

const meta = {
  title: "Design System/Data Display/Badge",
  tags: ["autodocs"],
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "success",
        "warning",
        "info",
        "solid-success",
        "outline",
        "ghost",
        "link",
      ],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

const Dot = ({ className }: { className?: string }) => (
  <span className={`size-1.5 rounded-full bg-current ${className ?? ""}`} aria-hidden />
);

export const Success: Story = {
  args: {
    variant: "success",
    children: (
      <>
        <Check /> Success
      </>
    ),
  },
};

export const Error: Story = {
  args: {
    variant: "destructive",
    children: (
      <>
        <X /> Error
      </>
    ),
  },
};

export const Running: Story = {
  args: {
    variant: "warning",
    children: (
      <>
        <Dot /> Running
      </>
    ),
  },
};

export const New: Story = {
  args: {
    variant: "info",
    children: (
      <>
        <Dot /> New
      </>
    ),
  },
};

export const Draft: Story = {
  args: { variant: "ghost", children: "Draft" },
};

export const SolidAdd: Story = {
  args: { variant: "solid-success", children: "Solid Add" },
};

export const SolidAccent: Story = {
  args: { children: "Solid Accent" },
};

export const Chip: Story = {
  args: { variant: "outline", children: "claude-haiku-4-5" },
};

export const Showcase: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--top-bar-bg)] p-4">
      <Badge variant="success">
        <Check /> Success
      </Badge>
      <Badge variant="destructive">
        <X /> Error
      </Badge>
      <Badge variant="warning">
        <Dot /> Running
      </Badge>
      <Badge variant="info">
        <Dot /> New
      </Badge>
      <Badge variant="ghost">Draft</Badge>
      <Badge variant="solid-success">Solid Add</Badge>
      <Badge>Solid Accent</Badge>
      <Badge variant="outline" className="font-mono normal-case">
        claude-haiku-4-5
      </Badge>
      <Badge variant="outline">3 fields</Badge>
      <Badge variant="outline" className="font-mono normal-case">
        cron · 07:00
      </Badge>
      <Badge variant="outline" className="font-mono normal-case">
        #daily
      </Badge>
    </div>
  ),
};
