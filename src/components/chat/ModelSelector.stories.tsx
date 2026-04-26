import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { ChatEffort } from "#/lib/chat/chat-models";
import type { ChatModelOption } from "#/lib/chat/chat-models.functions";
import { ModelSelector } from "./ModelSelector";

const SAMPLE_MODELS: ChatModelOption[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    description: "Fastest",
    supportsEffort: false,
    provider: "anthropic",
    inputCostPerMillionTokensUsd: 1,
    outputCostPerMillionTokensUsd: 5,
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Balanced",
    supportsEffort: true,
    provider: "anthropic",
    inputCostPerMillionTokensUsd: 3,
    outputCostPerMillionTokensUsd: 15,
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    description: "Strongest",
    supportsEffort: true,
    provider: "anthropic",
    inputCostPerMillionTokensUsd: 5,
    outputCostPerMillionTokensUsd: 25,
  },
  {
    id: "MiniMax-M2.7",
    label: "MiniMax M2.7",
    description: "Agentic, autonomous",
    supportsEffort: false,
    provider: "minimax",
    inputCostPerMillionTokensUsd: 0.3,
    outputCostPerMillionTokensUsd: 1.2,
  },
  {
    id: "z-ai/glm-5.1",
    label: "GLM-5.1",
    description: "Complex systems engineering",
    supportsEffort: false,
    provider: "openrouter",
    inputCostPerMillionTokensUsd: 1.26,
    outputCostPerMillionTokensUsd: 3.96,
  },
  {
    id: "moonshotai/kimi-k2.5",
    label: "Kimi K2.5",
    description: "Low-cost reasoning",
    supportsEffort: false,
    provider: "openrouter",
    inputCostPerMillionTokensUsd: 0.44,
    outputCostPerMillionTokensUsd: 2.2,
  },
  {
    id: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6",
    description: "Agentic coding",
    supportsEffort: false,
    provider: "openrouter",
    inputCostPerMillionTokensUsd: 0.75,
    outputCostPerMillionTokensUsd: 3.5,
  },
];

const MANY_MODELS: ChatModelOption[] = [
  ...SAMPLE_MODELS,
  ...Array.from({ length: 24 }, (_, i) => ({
    id: `acme/test-model-${i + 1}`,
    label: `StepFun: Step 3.5 Flash variant ${i + 1}`,
    description: i % 3 === 0 ? "Reasoning" : i % 3 === 1 ? "Coding" : "General",
    supportsEffort: i % 4 === 0,
    provider: i % 2 === 0 ? "openrouter" : "anthropic",
    inputCostPerMillionTokensUsd: 0.5 + (i % 5),
    outputCostPerMillionTokensUsd: 2 + (i % 7),
  })),
];

const meta = {
  title: "Features/Chat/Model Selector",
  tags: ["autodocs"],
  component: ModelSelector,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ModelSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    model: "claude-sonnet-4-6",
    effort: "low",
    modelLabel: "Claude Sonnet 4.6",
    modelDescription: "Balanced",
    models: SAMPLE_MODELS,
  },
};

export const NoEffortSupport: Story = {
  args: {
    model: "claude-haiku-4-5",
    effort: "low",
    modelLabel: "Claude Haiku 4.5",
    modelDescription: "Fastest",
    models: SAMPLE_MODELS,
  },
};

export const Disabled: Story = {
  args: {
    model: "claude-sonnet-4-6",
    effort: "medium",
    modelLabel: "Claude Sonnet 4.6",
    models: SAMPLE_MODELS,
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    model: "claude-sonnet-4-6",
    effort: "low",
    modelLabel: "Claude Sonnet 4.6",
    modelDescription: "Balanced",
    models: undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          "No `models` override and the server fn isn't reachable from Storybook — the trigger renders from the seeded label and the panel shows a loading message.",
      },
    },
  },
};

export const RemovedModel: Story = {
  args: {
    model: "claude-some-retired-model",
    effort: "low",
    modelLabel: "Claude Retired 3.0",
    modelDescription: "Removed",
    models: SAMPLE_MODELS,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Selected model isn't in the loaded list — it appears at the top of the panel as `unavailable` so the user can switch off it.",
      },
    },
  },
};

export const ManyModels: Story = {
  args: {
    model: "claude-sonnet-4-6",
    effort: "low",
    modelLabel: "Claude Sonnet 4.6",
    models: MANY_MODELS,
  },
  parameters: {
    docs: {
      description: {
        story:
          '32 models, including long names (e.g. "StepFun: Step 3.5 Flash variant N") to verify the trigger width and search.',
      },
    },
  },
};

const DUPLICATE_ID_MODELS: ChatModelOption[] = [
  ...SAMPLE_MODELS,
  // Same id as the built-in MiniMax-M2.7 alias, but routed via OpenRouter.
  {
    id: "minimax/minimax-m2.7",
    label: "MiniMax M2.7",
    description: "Agentic, autonomous",
    supportsEffort: false,
    provider: "openrouter",
    inputCostPerMillionTokensUsd: 0.32,
    outputCostPerMillionTokensUsd: 1.3,
    userSelected: true,
  },
];

export const DuplicateIdsAcrossProviders: Story = {
  args: {
    model: "MiniMax-M2.7",
    effort: "low",
    modelLabel: "MiniMax M2.7",
    models: DUPLICATE_ID_MODELS,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Two `MiniMax M2.7` rows — one routed through MiniMax direct, the other through the user's OpenRouter selection. Both show a provider tag inline so they are visually distinguishable.",
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    model: "claude-sonnet-4-6",
    effort: "low",
    models: SAMPLE_MODELS,
  },
  render: (args) => {
    const [model, setModel] = useState(args.model);
    const [effort, setEffort] = useState<ChatEffort>(args.effort);
    const resolved = args.models?.find((m) => m.id === model);
    return (
      <div className="space-y-3">
        <ModelSelector
          {...args}
          model={model}
          effort={effort}
          modelLabel={resolved?.label}
          modelDescription={resolved?.description}
          onModelChange={setModel}
          onEffortChange={(e) => setEffort(e as ChatEffort)}
        />
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          Selected: <span className="text-[var(--ink)]">{model}</span> · Effort:{" "}
          <span className="text-[var(--ink)]">{effort}</span>
        </div>
      </div>
    );
  },
};
