import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldRow } from "./field-row";
import { Input } from "./input";
import { Textarea } from "./textarea";

const meta = {
  title: "Design System/Forms/Field Row",
  tags: ["autodocs"],
  component: FieldRow,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FieldRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "" } as never,
  render: () => (
    <div className="flex w-96 flex-col gap-5">
      <FieldRow label="Name" htmlFor="name">
        <Input id="name" defaultValue="Daily standup digest" />
      </FieldRow>
      <FieldRow label="Cron" required hint="UTC" htmlFor="cron">
        <Input id="cron" defaultValue="0 9 * * 1-5" className="font-mono" />
      </FieldRow>
      <FieldRow label="Prompt" htmlFor="prompt" hint="markdown">
        <Textarea id="prompt" rows={4} defaultValue="Summarize my open PRs and overdue tasks." />
      </FieldRow>
    </div>
  ),
};
