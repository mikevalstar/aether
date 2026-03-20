import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MentionTextarea } from "./MentionTextarea";

const meta: Meta<typeof MentionTextarea> = {
  title: "Mentions/MentionTextarea",
  component: MentionTextarea,
};

export default meta;
type Story = StoryObj<typeof MentionTextarea>;

function Controlled(props: { placeholder?: string; rows?: number }) {
  const [value, setValue] = useState("");
  return (
    <div className="w-96 space-y-2">
      <MentionTextarea value={value} onValueChange={setValue} {...props} />
      <p className="text-xs text-muted-foreground">
        Current value: <code className="rounded bg-muted px-1">{value || "(empty)"}</code>
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <Controlled placeholder="Type @ to mention a file..." rows={3} />,
};

export const WithExistingText: Story = {
  render: () => {
    const [value, setValue] = useState("Check out @`Projects/Aether` for details");
    return (
      <div className="w-96 space-y-2">
        <MentionTextarea value={value} onValueChange={setValue} rows={3} />
        <p className="text-xs text-muted-foreground">
          Current value: <code className="rounded bg-muted px-1">{value}</code>
        </p>
      </div>
    );
  },
};
