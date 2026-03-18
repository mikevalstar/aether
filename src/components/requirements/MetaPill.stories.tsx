import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarDaysIcon, TagIcon, UserRoundIcon } from "lucide-react";
import { MetaPill } from "./MetaPill";

const meta = {
  title: "Features/Requirements/Meta Pill",
  tags: ["autodocs"],
  component: MetaPill,
} satisfies Meta<typeof MetaPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithUser: Story = {
  args: {
    icon: <UserRoundIcon className="size-3.5" />,
    children: "Mike Valstar",
  },
};

export const WithDate: Story = {
  args: {
    icon: <CalendarDaysIcon className="size-3.5" />,
    children: "2026-03-14",
  },
};

export const WithTag: Story = {
  args: {
    icon: <TagIcon className="size-3.5" />,
    children: "v1.2.0",
  },
};

export const MetadataRow: Story = {
  args: {
    icon: <UserRoundIcon className="size-3.5" />,
    children: "Mike Valstar",
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <MetaPill icon={<UserRoundIcon className="size-3.5" />}>Mike Valstar</MetaPill>
      <MetaPill icon={<CalendarDaysIcon className="size-3.5" />}>2026-03-14</MetaPill>
      <MetaPill icon={<TagIcon className="size-3.5" />}>v1.2.0</MetaPill>
    </div>
  ),
};
