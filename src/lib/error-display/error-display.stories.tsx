import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorBoundary } from "./error-boundary";
import { ErrorDisplay } from "./error-display";

const meta = {
	title: "Lib/Error Display",
	component: ErrorDisplay,
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta<typeof ErrorDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

function createError(type: string, message: string): Error {
	const err = new Error(message);
	err.name = type;
	return err;
}

function createErrorWithStack(): Error {
	try {
		const obj: Record<string, unknown> = {};
		// @ts-expect-error intentional for demo
		obj.deep.nested.property.access();
	} catch (e) {
		return e as Error;
	}
	return new Error("fallback");
}

export const RealTypeError: Story = {
	args: {
		error: createErrorWithStack(),
		defaultExpanded: true,
	},
};

export const SimpleError: Story = {
	args: {
		error: createError("Error", "Something went wrong while processing the request."),
		defaultExpanded: true,
	},
};

export const NetworkError: Story = {
	args: {
		error: createError("NetworkError", "Failed to fetch data from https://api.example.com/v1/users — connection refused."),
		defaultExpanded: true,
		showURL: true,
	},
};

export const ValidationError: Story = {
	args: {
		error: createError("ValidationError", 'Field "email" must be a valid email address. Received: "not-an-email"'),
		defaultExpanded: true,
	},
};

export const WithRetryAndDismiss: Story = {
	args: {
		error: createError("TimeoutError", "Request timed out after 30000ms."),
		defaultExpanded: true,
		onRetry: () => alert("Retrying..."),
		onDismiss: () => alert("Dismissed!"),
	},
};

export const StringError: Story = {
	args: {
		error: "An unexpected string error occurred",
		defaultExpanded: true,
	},
};

export const ObjectError: Story = {
	args: {
		error: {
			code: "ERR_INVALID_STATE",
			detail: "Session expired",
			statusCode: 401,
		},
		defaultExpanded: true,
	},
};

function BuggyComponent(): React.ReactNode {
	throw new Error("This component always crashes!");
}

export const WithErrorBoundary: StoryObj = {
	render: () => (
		<ErrorBoundary>
			<BuggyComponent />
		</ErrorBoundary>
	),
};

export const Collapsed: Story = {
	args: {
		error: createErrorWithStack(),
		defaultExpanded: false,
	},
};
