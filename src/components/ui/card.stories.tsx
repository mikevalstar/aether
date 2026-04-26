import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const meta = {
  title: "Design System/Layout/Card",
  tags: ["autodocs"],
  component: Card,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Account usage</CardTitle>
        <CardDescription>Your token spend over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You've used 1.2M input and 380K output tokens across Claude Haiku 4.5 and Sonnet 4.6.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">View detail</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Embeddings backfill</CardTitle>
        <CardDescription>Last run 2 hours ago — 1,284 docs indexed.</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">
            Run now
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  ),
};
