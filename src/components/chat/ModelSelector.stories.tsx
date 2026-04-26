import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { ChatModelOption } from "#/lib/chat/chat-models.functions";
import { ModelSelector } from "./ModelSelector";

const SAMPLE_MODELS: ChatModelOption[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    description: "Fastest",
    supportsEffort: false,
    provider: "anthropic",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Balanced",
    supportsEffort: true,
    provider: "anthropic",
  },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", description: "Strongest", supportsEffort: true, provider: "anthropic" },
  {
    id: "moonshotai/kimi-k2.5",
    label: "Kimi K2.5",
    description: "Low-cost reasoning",
    supportsEffort: false,
    provider: "openrouter",
  },
  {
    id: "z-ai/glm-5.1",
    label: "GLM-5.1",
    description: "Complex systems engineering",
    supportsEffort: false,
    provider: "openrouter",
  },
];

const noop = () => {};

const meta = {
  title: "Features/Chat/Model Selector",
  tags: ["autodocs"],
  component: ModelSelector,
  args: {
    onModelChange: noop,
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-32 items-start p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ModelSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    model: "claude-haiku-4-5",
    modelLabel: "Claude Haiku 4.5",
    modelDescription: "Fastest",
    models: SAMPLE_MODELS,
    className: "min-w-48",
  },
};

export const Sonnet: Story = {
  args: {
    model: "claude-sonnet-4-6",
    modelLabel: "Claude Sonnet 4.6",
    modelDescription: "Balanced",
    models: SAMPLE_MODELS,
    className: "min-w-48",
  },
};

export const Disabled: Story = {
  args: {
    model: "claude-haiku-4-5",
    modelLabel: "Claude Haiku 4.5",
    modelDescription: "Fastest",
    models: SAMPLE_MODELS,
    disabled: true,
    className: "min-w-48",
  },
};

export const NoBadges: Story = {
  args: {
    model: "claude-sonnet-4-6",
    modelLabel: "Claude Sonnet 4.6",
    models: SAMPLE_MODELS,
    showBadges: false,
    className: "min-w-48",
  },
};

/** Models prop omitted — simulates the loading state where only the seeded prop renders. */
export const Loading: Story = {
  args: {
    model: "claude-haiku-4-5",
    modelLabel: "Claude Haiku 4.5",
    modelDescription: "Fastest",
    models: undefined,
    className: "min-w-48",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Without a `models` override and no working server function, only the seed (label/description from props) renders. This is the brief flash users see before the list arrives — and the permanent state if the fetch fails.",
      },
    },
  },
};

/** Selected model is not in the loaded list — appended as "unavailable" so it stays selectable. */
export const RemovedModel: Story = {
  args: {
    model: "claude-some-retired-model",
    modelLabel: "Claude Retired 3.0",
    modelDescription: "Removed",
    models: SAMPLE_MODELS,
    className: "min-w-56",
  },
  parameters: {
    docs: {
      description: {
        story:
          "If the configured model is no longer in the list, the trigger still renders the seeded label and the dropdown appends an `unavailable` entry so the user can switch off it without losing context.",
      },
    },
  },
};

/** Interactive: state is owned by the story so changes show in the trigger. */
export const Interactive: Story = {
  args: {
    model: "claude-haiku-4-5",
    modelLabel: "Claude Haiku 4.5",
    modelDescription: "Fastest",
    models: SAMPLE_MODELS,
    className: "min-w-48",
  },
  render: (args) => {
    const [model, setModel] = useState(args.model);
    const resolved = args.models?.find((m) => m.id === model);
    return (
      <ModelSelector
        {...args}
        model={model}
        modelLabel={resolved?.label ?? args.modelLabel}
        modelDescription={resolved?.description ?? args.modelDescription}
        onModelChange={setModel}
      />
    );
  },
};
