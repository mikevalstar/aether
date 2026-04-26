import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, AvatarFallback } from "./avatar";
import { Button } from "./button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

const meta = {
  title: "Design System/Overlays/Hover Card",
  tags: ["autodocs"],
  component: HoverCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@mikevalstar</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>MV</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">Mike Valstar</p>
            <p className="text-xs text-muted-foreground">Solo operator of this Aether instance.</p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
