import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import { CronBuilder } from "./CronBuilder";

const meta = {
  title: "Features/Config Editor/Cron Builder",
  tags: ["autodocs"],
  component: CronBuilder,
  decorators: [
    (Story) => (
      <div className="max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CronBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Daily: Story = {
  args: {
    value: "0 9 * * *",
    onChange: fn(),
  },
};

export const Weekly: Story = {
  args: {
    value: "30 18 * * 5",
    onChange: fn(),
  },
};

export const Hourly: Story = {
  args: {
    value: "15 * * * *",
    onChange: fn(),
  },
};

export const Monthly: Story = {
  args: {
    value: "0 8 1 * *",
    onChange: fn(),
  },
};

export const EveryMinute: Story = {
  args: {
    value: "* * * * *",
    onChange: fn(),
  },
};

export const WithTimezone: Story = {
  args: {
    value: "0 9 * * *",
    onChange: fn(),
    timezone: "America/Toronto",
  },
};
