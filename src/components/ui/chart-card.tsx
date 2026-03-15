import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface ChartCardProps {
	/** Card heading */
	title: string;
	/** Supporting description */
	subtitle: string;
	/** Optional Lucide icon shown before the title */
	icon?: LucideIcon;
	/** CSS color value or var reference for the icon badge (defaults to teal) */
	accentColor?: string;
	children?: ReactNode;
}

export function ChartCard({
	title,
	subtitle,
	icon: Icon,
	accentColor,
	children,
}: ChartCardProps) {
	return (
		<section className="surface-card p-5">
			<div className="mb-4 flex items-start gap-3">
				{Icon && (
					<div
						className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
						style={{
							backgroundColor: accentColor
								? `oklch(from ${accentColor} l c h / 0.1)`
								: "oklch(from var(--teal) l c h / 0.1)",
							color: accentColor ?? "var(--teal)",
						}}
					>
						<Icon className="size-4" strokeWidth={1.75} />
					</div>
				)}
				<div>
					<h2 className="text-base font-semibold">{title}</h2>
					<p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
				</div>
			</div>
			{children}
		</section>
	);
}
