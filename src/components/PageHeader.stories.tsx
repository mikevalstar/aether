import type { Meta, StoryObj } from "@storybook/react-vite";
import { Activity, BarChart3, Plus, RefreshCw, TerminalSquare, Workflow } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Button } from "./ui/button";

const meta = {
  title: "Components/PageHeader",
  tags: ["autodocs"],
  component: PageHeader,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Workflow,
    label: "Workflows",
    title: "",
    highlight: "Workflows",
    description:
      "Form-based AI workflows that run in the background. Define workflows as markdown files in your AI config — Aether picks them up automatically.",
  },
};

export const WithActions: Story = {
  args: {
    icon: Workflow,
    label: "Workflows",
    title: "",
    highlight: "Workflows",
    description:
      "Form-based AI workflows that run in the background. Define workflows as markdown files in your AI config — Aether picks them up automatically.",
    actions: (
      <>
        <Button variant="outline" size="sm">
          <RefreshCw /> Refresh
        </Button>
        <Button size="sm">
          <Plus /> New workflow
        </Button>
      </>
    ),
  },
};

export const SingleAction: Story = {
  args: {
    icon: BarChart3,
    label: "Usage",
    title: "Token & cost",
    highlight: "tracking",
    description: "Track spend, token volume, and prompt count across every completed chat exchange.",
    actions: (
      <Button variant="outline" size="sm">
        Open chat
      </Button>
    ),
  },
};

export const NoDescription: Story = {
  args: {
    icon: Activity,
    label: "Activity",
    title: "Recent",
    highlight: "activity",
  },
};

export const NoGlow: Story = {
  args: {
    icon: TerminalSquare,
    label: "Logs",
    title: "Daily log",
    highlight: "viewer",
    glows: false,
    actions: (
      <Button variant="outline" size="sm">
        <RefreshCw /> Auto-refresh
      </Button>
    ),
  },
};
