import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import { useState } from "react";
import { type FieldDefinition, FieldsArrayEditor } from "./FieldsArrayEditor";

function FieldsArrayEditorWrapper(props: {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  bodyPlaceholders?: string[];
}) {
  const [fields, setFields] = useState(props.fields);
  return (
    <FieldsArrayEditor
      fields={fields}
      onChange={(f) => {
        setFields(f);
        props.onChange(f);
      }}
      bodyPlaceholders={props.bodyPlaceholders}
    />
  );
}

const sampleFields: FieldDefinition[] = [
  {
    name: "url",
    label: "Recipe URL",
    type: "url",
    required: true,
    placeholder: "https://example.com/recipe/...",
    options: [],
    default: "",
  },
  {
    name: "instructions",
    label: "Additional Instructions",
    type: "textarea",
    required: false,
    placeholder: "Any modifications or notes...",
    options: [],
    default: "",
  },
];

const selectFields: FieldDefinition[] = [
  {
    name: "topic",
    label: "Topic",
    type: "text",
    required: true,
    placeholder: "",
    options: [],
    default: "",
  },
  {
    name: "style",
    label: "Writing Style",
    type: "select",
    required: true,
    placeholder: "",
    options: ["formal", "casual", "technical"],
    default: "casual",
  },
  {
    name: "length",
    label: "Target Length",
    type: "select",
    required: false,
    placeholder: "",
    options: ["short", "medium", "long"],
    default: "",
  },
];

const meta = {
  title: "Features/Config Editor/Fields Array Editor",
  tags: ["autodocs"],
  component: FieldsArrayEditor,
  decorators: [
    (Story) => (
      <div className="max-w-lg p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FieldsArrayEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    fields: sampleFields,
    onChange: fn(),
    bodyPlaceholders: ["url", "instructions"],
  },
  render: (args) => <FieldsArrayEditorWrapper {...args} />,
};

export const WithSelectFields: Story = {
  args: {
    fields: selectFields,
    onChange: fn(),
    bodyPlaceholders: ["topic", "style", "length"],
  },
  render: (args) => <FieldsArrayEditorWrapper {...args} />,
};

export const Empty: Story = {
  args: {
    fields: [],
    onChange: fn(),
    bodyPlaceholders: [],
  },
  render: (args) => <FieldsArrayEditorWrapper {...args} />,
};

export const WithOrphanedPlaceholders: Story = {
  args: {
    fields: sampleFields,
    onChange: fn(),
    bodyPlaceholders: ["url", "instructions", "category", "tags"],
  },
  render: (args) => <FieldsArrayEditorWrapper {...args} />,
};

export const WithWarnings: Story = {
  args: {
    fields: [
      { name: "", label: "", type: "text", required: true, placeholder: "", options: [], default: "" },
      { name: "url", label: "URL", type: "select", required: true, placeholder: "", options: [], default: "" },
    ],
    onChange: fn(),
    bodyPlaceholders: ["url", "missing"],
  },
  render: (args) => <FieldsArrayEditorWrapper {...args} />,
};
