import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
	title: "Design System/Foundations/Tokens",
} satisfies Meta;

export default meta;
type Story = StoryObj;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function Swatch({ name, bg, fg, className }: { name: string; bg: string; fg?: string; className?: string }) {
	return (
		<div className="flex flex-col items-center gap-1.5">
			<div
				className={`size-14 rounded-lg border border-border shadow-sm ${className ?? ""}`}
				style={{ background: `var(${bg})` }}
			/>
			<span className="text-[11px] font-medium">{name}</span>
			{fg && <span className="text-[10px] text-muted-foreground">{fg}</span>}
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="mb-10">
			<h2 className="mb-4 border-b border-border pb-2 text-lg font-semibold">{title}</h2>
			{children}
		</section>
	);
}

/* ------------------------------------------------------------------ */
/*  Colors                                                            */
/* ------------------------------------------------------------------ */

export const Colors: Story = {
	render: () => (
		<div className="max-w-3xl space-y-10 p-6">
			<div>
				<h1 className="display-title mb-1 text-2xl font-bold">Color Palette</h1>
				<p className="text-sm text-muted-foreground">All colors use OKLCH and adapt to light/dark mode via CSS variables.</p>
			</div>

			<Section title="Brand">
				<div className="flex flex-wrap gap-5">
					<Swatch name="Teal" bg="--teal" fg="bg-primary" />
					<Swatch name="Teal Hover" bg="--teal-hover" />
					<Swatch name="Teal Subtle" bg="--teal-subtle" fg="bg-secondary" />
					<Swatch name="Coral" bg="--coral" fg="bg-coral" />
					<Swatch name="Coral Hover" bg="--coral-hover" />
				</div>
			</Section>

			<Section title="Neutrals">
				<div className="flex flex-wrap gap-5">
					<Swatch name="Background" bg="--bg" fg="bg-background" />
					<Swatch name="Surface" bg="--surface" fg="bg-card" />
					<Swatch name="Muted" bg="--muted" fg="bg-muted" />
					<Swatch name="Line" bg="--line" fg="border-border" />
					<Swatch name="Ink" bg="--ink" fg="text-foreground" />
					<Swatch name="Ink Soft" bg="--ink-soft" fg="text-muted-foreground" />
				</div>
			</Section>

			<Section title="Semantic">
				<div className="flex flex-wrap gap-5">
					<Swatch name="Primary" bg="--primary" fg="bg-primary" />
					<Swatch name="Primary FG" bg="--primary-foreground" fg="text-primary-foreground" />
					<Swatch name="Secondary" bg="--secondary" fg="bg-secondary" />
					<Swatch name="Accent" bg="--accent" fg="bg-accent" />
					<Swatch name="Destructive" bg="--destructive" fg="bg-destructive" />
					<Swatch name="Ring" bg="--ring" fg="ring-ring" />
				</div>
			</Section>

			<Section title="Chart">
				<div className="flex flex-wrap gap-5">
					<Swatch name="Chart 1" bg="--chart-1" fg="chart-1" />
					<Swatch name="Chart 2" bg="--chart-2" fg="chart-2" />
					<Swatch name="Chart 3" bg="--chart-3" fg="chart-3" />
					<Swatch name="Chart 4" bg="--chart-4" fg="chart-4" />
					<Swatch name="Chart 5" bg="--chart-5" fg="chart-5" />
				</div>
			</Section>
		</div>
	),
};

/* ------------------------------------------------------------------ */
/*  Typography                                                        */
/* ------------------------------------------------------------------ */

export const Typography: Story = {
	render: () => (
		<div className="max-w-3xl space-y-10 p-6">
			<div>
				<h1 className="display-title mb-1 text-2xl font-bold">Typography</h1>
				<p className="text-sm text-muted-foreground">Manrope for UI text, Fraunces for display headings.</p>
			</div>

			<Section title="Display (Fraunces)">
				<div className="space-y-4">
					<p className="display-title text-5xl font-bold tracking-tight">Display — 5xl Bold</p>
					<p className="display-title text-4xl font-bold tracking-tight">Display — 4xl Bold</p>
					<p className="display-title text-3xl font-bold tracking-tight">Display — 3xl Bold</p>
					<p className="display-title text-2xl font-bold tracking-tight">Display — 2xl Bold</p>
					<p className="display-title text-xl font-bold tracking-tight">Display — xl Bold</p>
				</div>
			</Section>

			<Section title="Sans (Manrope)">
				<div className="space-y-3">
					<p className="text-base font-bold">Base — Bold (800)</p>
					<p className="text-base font-semibold">Base — Semibold (700)</p>
					<p className="text-base font-medium">Base — Medium (600)</p>
					<p className="text-base">Base — Regular (400)</p>
					<p className="text-sm font-semibold">Small — Semibold</p>
					<p className="text-sm font-medium">Small — Medium</p>
					<p className="text-sm">Small — Regular</p>
					<p className="text-xs font-semibold uppercase tracking-widest">Overline — XS Semibold Uppercase</p>
					<p className="text-xs text-muted-foreground">Caption — XS Muted</p>
				</div>
			</Section>

			<Section title="Text Colors">
				<div className="space-y-2">
					<p className="text-foreground">text-foreground — Primary text (--ink)</p>
					<p className="text-muted-foreground">text-muted-foreground — Secondary text (--ink-soft)</p>
					<p className="text-primary">text-primary — Links &amp; accents (--teal)</p>
					<p className="text-destructive">text-destructive — Errors &amp; danger</p>
				</div>
			</Section>

			<Section title="Links">
				<div className="space-y-2">
					<p>
						Default <a href="#link">link style</a> inherited from base styles.
					</p>
					<p>
						<a href="#link" className="nav-link">
							Nav link
						</a>{" "}
						— used in the header with underline animation.
					</p>
				</div>
			</Section>

			<Section title="Code">
				<div className="space-y-3">
					<p>
						Inline <code>code snippet</code> with border and background.
					</p>
					<pre className="rounded-lg border border-border bg-[oklch(0.16_0.01_180)] p-4 text-sm text-[oklch(0.92_0.01_180)]">
						<code>{"// Code block\nconst x = 42;"}</code>
					</pre>
				</div>
			</Section>
		</div>
	),
};

/* ------------------------------------------------------------------ */
/*  Spacing & Radius                                                  */
/* ------------------------------------------------------------------ */

export const SpacingAndRadius: Story = {
	name: "Spacing & Radius",
	render: () => (
		<div className="max-w-3xl space-y-10 p-6">
			<div>
				<h1 className="display-title mb-1 text-2xl font-bold">Spacing &amp; Radius</h1>
				<p className="text-sm text-muted-foreground">Standard Tailwind 4px grid for spacing. Custom radius scale.</p>
			</div>

			<Section title="Border Radius">
				<div className="flex flex-wrap items-end gap-6">
					{[
						["sm", "rounded-sm", "4px"],
						["md", "rounded-md", "6px"],
						["lg", "rounded-lg", "8px (base)"],
						["xl", "rounded-xl", "12px"],
						["full", "rounded-full", "9999px"],
					].map(([label, cls, value]) => (
						<div key={label} className="flex flex-col items-center gap-1.5">
							<div className={`size-14 border-2 border-primary bg-secondary ${cls}`} />
							<span className="text-xs font-medium">{cls}</span>
							<span className="text-[10px] text-muted-foreground">{value}</span>
						</div>
					))}
				</div>
			</Section>

			<Section title="Spacing Scale (common)">
				<div className="space-y-2">
					{[1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) => (
						<div key={n} className="flex items-center gap-3">
							<span className="w-12 text-right text-xs text-muted-foreground">{n}</span>
							<div className="h-3 rounded-sm bg-primary" style={{ width: `${n * 4}px` }} />
							<span className="text-[11px] text-muted-foreground">{n * 4}px</span>
						</div>
					))}
				</div>
			</Section>
		</div>
	),
};

/* ------------------------------------------------------------------ */
/*  Surfaces & Patterns                                               */
/* ------------------------------------------------------------------ */

export const Surfaces: Story = {
	render: () => (
		<div className="max-w-3xl space-y-10 p-6">
			<div>
				<h1 className="display-title mb-1 text-2xl font-bold">Surfaces &amp; Patterns</h1>
				<p className="text-sm text-muted-foreground">Reusable surface classes and layout patterns used across the app.</p>
			</div>

			<Section title="Surface Card">
				<p className="mb-3 text-sm text-muted-foreground">
					<code>.surface-card</code> — Card background, border, and radius. Used for content containers.
				</p>
				<div className="surface-card p-6">
					<p className="text-sm font-semibold">Card Title</p>
					<p className="mt-1 text-sm text-muted-foreground">Card content using the surface-card utility class.</p>
				</div>
			</Section>

			<Section title="Page Wrap">
				<p className="mb-3 text-sm text-muted-foreground">
					<code>.page-wrap</code> — Max 1560px, centered, with responsive side padding. Applied to page content containers.
				</p>
				<div className="rounded-lg border border-dashed border-border p-4">
					<div className="rounded bg-primary/10 px-4 py-3 text-center text-xs text-muted-foreground">
						max-width: min(1560px, calc(100% - 2rem))
					</div>
				</div>
			</Section>

			<Section title="Feature Grid">
				<p className="mb-3 text-sm text-muted-foreground">
					Border-separated grid using <code>bg-border gap-px</code> with card-colored children.
				</p>
				<div className="grid overflow-hidden rounded-lg border border-border bg-border gap-px sm:grid-cols-3">
					{["Card One", "Card Two", "Card Three"].map((title) => (
						<div key={title} className="bg-card p-6">
							<p className="text-sm font-semibold">{title}</p>
							<p className="mt-1 text-sm text-muted-foreground">Description text here.</p>
						</div>
					))}
				</div>
			</Section>

			<Section title="Page Header Pattern">
				<p className="mb-3 text-sm text-muted-foreground">Consistent page header: overline, display title, subtitle.</p>
				<div className="rounded-lg border border-dashed border-border p-6">
					<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Section Label</p>
					<h2 className="display-title text-3xl font-bold tracking-tight sm:text-4xl">Page Title</h2>
					<p className="mt-2 text-sm text-muted-foreground">Subtitle or description text explaining this section.</p>
				</div>
			</Section>

			<Section title="Nav Link">
				<p className="mb-3 text-sm text-muted-foreground">
					<code>.nav-link</code> — Muted text with animated underline on hover. <code>.is-active</code> for current page.
				</p>
				<div className="flex items-center gap-5 text-sm font-medium">
					<a href="#active" className="nav-link is-active">
						Active
					</a>
					<a href="#hover" className="nav-link">
						Hover me
					</a>
					<a href="#another" className="nav-link">
						Another
					</a>
				</div>
			</Section>
		</div>
	),
};
