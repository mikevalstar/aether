import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "#/lib/utils";

const spinnerVariants = cva("animate-spin rounded-full border-2 border-current/30 border-t-current", {
	variants: {
		size: {
			default: "size-5",
			sm: "size-4",
			lg: "size-6",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

function Spinner({ className, size, ...props }: React.ComponentProps<"div"> & VariantProps<typeof spinnerVariants>) {
	return (
		<div
			data-slot="spinner"
			role="status"
			aria-label="Loading"
			className={cn(spinnerVariants({ size, className }))}
			{...props}
		/>
	);
}

export { Spinner, spinnerVariants };
