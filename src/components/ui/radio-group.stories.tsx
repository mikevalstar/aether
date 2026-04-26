import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "Design System/Forms/Radio Group",
  tags: ["autodocs"],
  component: RadioGroup,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="haiku" className="w-64">
      <div className="flex items-center gap-2">
        <RadioGroupItem id="haiku" value="haiku" />
        <Label htmlFor="haiku">Claude Haiku 4.5 — fastest</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="sonnet" value="sonnet" />
        <Label htmlFor="sonnet">Claude Sonnet 4.6 — balanced</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="opus" value="opus" />
        <Label htmlFor="opus">Claude Opus 4.6 — strongest</Label>
      </div>
    </RadioGroup>
  ),
};
