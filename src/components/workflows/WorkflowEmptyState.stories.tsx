import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorkflowEmptyState } from "./WorkflowEmptyState";

const meta = {
  title: "Features/Workflows/Empty State",
  tags: ["autodocs"],
  component: WorkflowEmptyState,
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkflowEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
