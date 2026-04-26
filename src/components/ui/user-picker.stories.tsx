import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { UserPicker } from "./user-picker";

const meta = {
  title: "Design System/Forms/User Picker",
  tags: ["autodocs"],
  component: UserPicker,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Multi-select picker for users in the system. Loads via a server function on first open — when running outside the app (e.g. Storybook) the user list will be empty.",
      },
    },
  },
} satisfies Meta<typeof UserPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: [], onChange: () => {} },
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-72">
        <UserPicker value={value} onChange={setValue} />
      </div>
    );
  },
};

export const AllSelected: Story = {
  args: { value: ["all"], onChange: () => {} },
  render: () => {
    const [value, setValue] = useState<string[]>(["all"]);
    return (
      <div className="w-72">
        <UserPicker value={value} onChange={setValue} />
      </div>
    );
  },
};
