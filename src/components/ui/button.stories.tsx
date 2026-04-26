import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpRight, Mail, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "Design System/Actions/Button",
  tags: ["autodocs"],
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: (
      <>
        <Play /> Primary
      </>
    ),
  },
};

export const Secondary: Story = {
  args: {
    variant: "outline",
    children: (
      <>
        <Pencil /> Secondary
      </>
    ),
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: (
      <>
        <ArrowUpRight /> Ghost
      </>
    ),
  },
};

export const Danger: Story = {
  args: {
    variant: "destructive",
    children: (
      <>
        <X /> Danger
      </>
    ),
  },
};

export const Small: Story = {
  args: { size: "sm", variant: "outline", children: "Small" },
};

export const Large: Story = {
  args: { size: "lg", children: "Large Primary" },
};

export const Link: Story = {
  args: { variant: "link", children: "Link" },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail /> Send Email
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    size: "icon",
    variant: "outline",
    children: <Plus />,
    "aria-label": "Add",
  },
};

export const Disabled: Story = {
  args: { children: "Disabled", disabled: true },
};

export const Showcase: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--top-bar-bg)] p-4">
      <Button>
        <Play /> Primary
      </Button>
      <Button variant="outline">
        <Pencil /> Secondary
      </Button>
      <Button variant="ghost">
        <ArrowUpRight /> Ghost
      </Button>
      <Button variant="destructive">
        <X /> Danger
      </Button>
      <Button size="sm" variant="outline">
        Small
      </Button>
      <Button size="lg">Large Primary</Button>
    </div>
  ),
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: (
      <>
        <Trash2 /> Delete
      </>
    ),
  },
};
