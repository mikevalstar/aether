import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta = {
  title: "Design System/Layout/Collapsible",
  tags: ["autodocs"],
  component: Collapsible,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Collapsible className="w-80 space-y-2">
      <div className="flex items-center justify-between gap-4 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
        <span className="text-sm font-medium">Advanced options</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon">
            <ChevronsUpDown className="size-4" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-muted-foreground">
        <p>Custom system prompt</p>
        <p>Tool restrictions</p>
        <p>Sub-agent budget</p>
      </CollapsibleContent>
    </Collapsible>
  ),
};
