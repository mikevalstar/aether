import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "Design System/Overlays/Popover",
  tags: ["autodocs"],
  component: Popover,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Edit dimensions</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-3">
          <p className="text-sm font-semibold">Dimensions</p>
          <div className="grid gap-2">
            <Label htmlFor="w">Width</Label>
            <Input id="w" defaultValue="100%" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="h">Height</Label>
            <Input id="h" defaultValue="auto" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
