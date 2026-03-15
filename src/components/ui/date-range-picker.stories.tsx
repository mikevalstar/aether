import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import { useState } from "react";
import { DateRangePicker } from "./date-range-picker";

const meta = {
	title: "Design System/Forms/DateRangePicker",
	component: DateRangePicker,
	args: {
		onChange: fn(),
	},
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const WithDateRange: Story = {
	args: {
		from: "2026-02-15",
		to: "2026-03-10",
	},
};

export const NoPresets: Story = {
	args: {
		from: "2026-03-01",
		to: "2026-03-14",
		showPresets: false,
	},
};

export const CustomDefault: Story = {
	args: {
		defaultPreset: "7d",
	},
};

export const Interactive: Story = {
	render: function InteractiveStory() {
		const [state, setState] = useState<{
			from?: string;
			to?: string;
		}>({});

		return (
			<div className="w-[320px]">
				<DateRangePicker
					from={state.from}
					to={state.to}
					onChange={(next) => setState(next)}
				/>
				<p className="mt-3 text-xs text-muted-foreground">
					State: {JSON.stringify(state)}
				</p>
			</div>
		);
	},
};
