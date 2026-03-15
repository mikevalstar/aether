import {
	CheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { toast, Toaster as Sonner, type ExternalToast, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			className="toaster group"
			position="bottom-right"
			gap={8}
			duration={8000}
			closeButton
			icons={{
				success: (
					<span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
						<CheckIcon className="size-3" strokeWidth={3} />
					</span>
				),
				info: (
					<span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--teal)]/15 text-[var(--teal)]">
						<InfoIcon className="size-3" strokeWidth={2.5} />
					</span>
				),
				warning: (
					<span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
						<TriangleAlertIcon className="size-3" strokeWidth={2.5} />
					</span>
				),
				error: (
					<span className="inline-flex size-5 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:bg-red-400/15 dark:text-red-400">
						<OctagonXIcon className="size-3" strokeWidth={2.5} />
					</span>
				),
				loading: (
					<Loader2Icon className="size-4 animate-spin text-[var(--teal)]" />
				),
			}}
			toastOptions={{
				unstyled: true,
				classNames: {
					toast:
						"aether-toast group flex w-full items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm shadow-lg shadow-black/8 backdrop-blur-sm dark:shadow-black/25",
					title: "font-medium text-[var(--ink)]",
					description: "text-[var(--ink-soft)] text-xs mt-0.5",
					actionButton:
						"ml-auto shrink-0 rounded-lg bg-[var(--teal)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--teal-hover)] transition-colors",
					cancelButton:
						"ml-auto shrink-0 rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--ink-soft)] hover:bg-[var(--muted)] transition-colors",
					closeButton:
						"absolute top-1.5 right-1.5 flex items-center justify-center size-5 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--muted)] transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
					success: "border-emerald-500/25 dark:border-emerald-400/20",
					error: "border-red-500/25 dark:border-red-400/20",
					warning: "border-amber-500/25 dark:border-amber-400/20",
					info: "border-[var(--teal)]/25",
				},
			}}
			{...props}
		/>
	);
};

/**
 * Pre-configured toast with sensible durations for a dashboard app:
 * - error: stays until manually dismissed
 * - warning: 15 seconds
 * - success/info/default: 8 seconds (Toaster default)
 */
const aetherToast = Object.assign(
	(...args: Parameters<typeof toast>) => toast(...args),
	{
		success: (message: string | React.ReactNode, data?: ExternalToast) =>
			toast.success(message, data),
		info: (message: string | React.ReactNode, data?: ExternalToast) =>
			toast.info(message, data),
		warning: (message: string | React.ReactNode, data?: ExternalToast) =>
			toast.warning(message, { duration: 15_000, ...data }),
		error: (message: string | React.ReactNode, data?: ExternalToast) =>
			toast.error(message, { duration: Number.POSITIVE_INFINITY, ...data }),
		loading: (message: string | React.ReactNode, data?: ExternalToast) =>
			toast.loading(message, data),
		promise: toast.promise,
		dismiss: toast.dismiss,
		message: toast.message,
		custom: toast.custom,
	},
);

export { Toaster, aetherToast as toast };
