import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Info as InfoIcon,
  KeyRound,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertActions,
  AlertDescription,
  AlertHeader,
  AlertTitle,
} from "./alert";

const meta = {
  title: "Design System/Feedback/Alert",
  tags: ["autodocs"],
  component: Alert,
  parameters: { layout: "padded" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "warning", "success", "info"],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <Alert {...args} className="max-w-3xl">
      <AlertHeader icon={<X />} label="Error" onDismiss={() => {}} />
      <AlertTitle>PR Reviewer failed on paperclip#412</AlertTitle>
      <AlertDescription>GitHub API returned 401 — token expired 3h ago</AlertDescription>
      <AlertActions>
        <AlertAction tone="primary">
          <RefreshCw /> Retry
        </AlertAction>
        <AlertAction>
          <KeyRound /> Update token
        </AlertAction>
        <AlertAction tone="ghost">
          <ArrowUpRight /> View log
        </AlertAction>
      </AlertActions>
    </Alert>
  ),
};

export const Warning: Story = {
  args: { variant: "warning" },
  render: (args) => (
    <Alert {...args} className="max-w-3xl">
      <AlertHeader icon={<AlertTriangle />} label="Warning" onDismiss={() => {}} />
      <AlertTitle>Calendar sync is running behind</AlertTitle>
      <AlertDescription>Last successful sync was 47 minutes ago.</AlertDescription>
      <AlertActions>
        <AlertAction tone="primary">
          <RefreshCw /> Sync now
        </AlertAction>
        <AlertAction>Open settings</AlertAction>
      </AlertActions>
    </Alert>
  ),
};

export const Success: Story = {
  args: { variant: "success" },
  render: (args) => (
    <Alert {...args} className="max-w-3xl">
      <AlertHeader icon={<CheckCircle2 />} label="Done" onDismiss={() => {}} />
      <AlertTitle>Embeddings backfill complete</AlertTitle>
      <AlertDescription>1,284 documents indexed in 38s.</AlertDescription>
    </Alert>
  ),
};

export const Info: Story = {
  args: { variant: "info" },
  render: (args) => (
    <Alert {...args} className="max-w-3xl">
      <AlertHeader icon={<InfoIcon />} label="Heads up" onDismiss={() => {}} />
      <AlertTitle>New chat model available</AlertTitle>
      <AlertDescription>Claude Opus 4.7 is now selectable in /settings/chat.</AlertDescription>
      <AlertActions>
        <AlertAction tone="primary">
          <ExternalLink /> Try it
        </AlertAction>
        <AlertAction tone="ghost">Dismiss</AlertAction>
      </AlertActions>
    </Alert>
  ),
};

export const Minimal: Story = {
  args: { variant: "default" },
  render: (args) => (
    <Alert {...args} className="max-w-3xl">
      <AlertHeader icon={<InfoIcon />} label="Note" />
      <AlertTitle>Scheduled maintenance window starts at 02:00 UTC</AlertTitle>
    </Alert>
  ),
};

export const Showcase: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-3">
      <Alert variant="destructive">
        <AlertHeader icon={<X />} label="Error" onDismiss={() => {}} />
        <AlertTitle>PR Reviewer failed on paperclip#412</AlertTitle>
        <AlertDescription>GitHub API returned 401 — token expired 3h ago</AlertDescription>
        <AlertActions>
          <AlertAction tone="primary">
            <RefreshCw /> Retry
          </AlertAction>
          <AlertAction>
            <KeyRound /> Update token
          </AlertAction>
          <AlertAction tone="ghost">
            <ArrowUpRight /> View log
          </AlertAction>
        </AlertActions>
      </Alert>
      <Alert variant="warning">
        <AlertHeader icon={<AlertTriangle />} label="Warning" />
        <AlertTitle>Calendar sync is running behind</AlertTitle>
        <AlertDescription>Last successful sync was 47 minutes ago.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertHeader icon={<CheckCircle2 />} label="Done" />
        <AlertTitle>Embeddings backfill complete</AlertTitle>
      </Alert>
      <Alert variant="info">
        <AlertHeader icon={<InfoIcon />} label="Heads up" />
        <AlertTitle>New chat model available</AlertTitle>
      </Alert>
    </div>
  ),
};
