import type { Meta, StoryObj } from "@storybook/react-vite";
import { Calendar, FileText, MessageSquare, Settings, Webhook } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

const meta = {
  title: "Design System/Navigation/Command",
  tags: ["autodocs"],
  component: Command,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {
  render: () => (
    <Command className="max-w-md rounded-md border border-[var(--line)] shadow-md">
      <CommandInput placeholder="Search pages, tasks, threads…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem>
            <MessageSquare /> Chat
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Calendar /> Tasks
          </CommandItem>
          <CommandItem>
            <Webhook /> Triggers
          </CommandItem>
          <CommandItem>
            <FileText /> Activity
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <Settings /> Profile
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
