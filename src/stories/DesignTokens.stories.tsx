import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Design System/Foundations/Tokens",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function Swatch({ name, bg, hint, className }: { name: string; bg: string; hint?: string; className?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`size-14 rounded-lg border border-border shadow-sm ${className ?? ""}`}
        style={{ background: `var(${bg})` }}
      />
      <span className="text-[11px] font-medium">{name}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mb-10">
      <h2 className="mb-2 border-b border-border pb-2 text-lg font-semibold">{title}</h2>
      {note && <p className="mb-4 text-xs text-muted-foreground">{note}</p>}
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
        <p className="text-sm text-muted-foreground">
          OKLCH values driven from CSS variables. Both light and dark modes are first-class — toggle Storybook's theme to
          verify both. Source: <code>docs/redesign/tokens.md</code>.
        </p>
      </div>

      <Section title="Accent" note="Single brand colour (#7cb0ff family). Replaces the previous teal + coral pair.">
        <div className="flex flex-wrap gap-5">
          <Swatch name="Accent" bg="--accent" hint="--accent" />
          <Swatch name="Accent Hover" bg="--accent-hover" hint="--accent-hover" />
          <Swatch name="Accent Subtle" bg="--accent-subtle" hint="--accent-subtle" />
          <Swatch name="Accent FG" bg="--accent-foreground" hint="--accent-foreground" />
          <Swatch name="Ring" bg="--ring" hint="--ring" />
        </div>
      </Section>

      <Section title="Surfaces" note="bg → surface → raised three-tier neutral system.">
        <div className="flex flex-wrap gap-5">
          <Swatch name="Background" bg="--bg" hint="--bg" />
          <Swatch name="Surface" bg="--surface" hint="--surface" />
          <Swatch name="Raised" bg="--raised" hint="--raised" />
          <Swatch name="Line" bg="--line" hint="--line" />
          <Swatch name="Line Strong" bg="--line-strong" hint="--line-strong" />
          <Swatch name="Header BG" bg="--header-bg" hint="--header-bg" />
          <Swatch name="Muted" bg="--muted" hint="--muted (shadcn)" />
        </div>
      </Section>

      <Section title="Ink (text)">
        <div className="flex flex-wrap gap-5">
          <Swatch name="Ink" bg="--ink" hint="primary text" />
          <Swatch name="Ink Soft" bg="--ink-soft" hint="body / labels" />
          <Swatch name="Ink Dim" bg="--ink-dim" hint="captions" />
          <Swatch name="Ink Faint" bg="--ink-faint" hint="disabled" />
        </div>
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap gap-5">
          <Swatch name="Destructive" bg="--destructive" />
          <Swatch name="Destructive Hover" bg="--destructive-hover" />
          <Swatch name="Destructive Subtle" bg="--destructive-subtle" />
          <Swatch name="Success" bg="--success" />
          <Swatch name="Success Subtle" bg="--success-subtle" />
          <Swatch name="Warning" bg="--warning" />
          <Swatch name="Warning Subtle" bg="--warning-subtle" />
        </div>
      </Section>

      <Section title="Shadcn semantic aliases" note="Mechanical mapping from brand tokens onto shadcn primitives.">
        <div className="flex flex-wrap gap-5">
          <Swatch name="Primary" bg="--primary" hint="→ --accent" />
          <Swatch name="Primary FG" bg="--primary-foreground" hint="→ --accent-foreground" />
          <Swatch name="Secondary" bg="--secondary" hint="→ --accent-subtle" />
          <Swatch name="Card" bg="--card" hint="→ --surface" />
          <Swatch name="Popover" bg="--popover" hint="→ --raised" />
          <Swatch name="Border" bg="--border" hint="→ --line" />
        </div>
      </Section>

      <Section title="Charts (5-stop sequence)">
        <div className="flex flex-wrap gap-5">
          <Swatch name="Chart 1" bg="--chart-1" hint="accent" />
          <Swatch name="Chart 2" bg="--chart-2" hint="purple" />
          <Swatch name="Chart 3" bg="--chart-3" hint="green" />
          <Swatch name="Chart 4" bg="--chart-4" hint="red" />
          <Swatch name="Chart 5" bg="--chart-5" hint="amber" />
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
        <p className="text-sm text-muted-foreground">
          Inter for UI &amp; body, Fraunces for display headings, JetBrains Mono for code. Default body size is 14px (
          <code>--text-base</code>) for an information-dense console.
        </p>
      </div>

      <Section title="Display (Fraunces)">
        <div className="space-y-3">
          <p className="display-title text-4xl font-semibold">Display — 4xl Semibold</p>
          <p className="display-title text-3xl font-semibold">Display — 3xl Semibold</p>
          <p className="display-title text-2xl font-semibold">Display — 2xl Semibold</p>
          <p className="display-title text-xl font-medium">Display — xl Medium</p>
        </div>
      </Section>

      <Section title="Sans (Inter)">
        <div className="space-y-2">
          <p className="text-md font-semibold">Comfortable body — 16px Semibold</p>
          <p className="text-md">Comfortable body — 16px Regular (--text-md)</p>
          <p className="text-base font-semibold">Default body — 14px Semibold</p>
          <p className="text-base font-medium">Default body — 14px Medium</p>
          <p className="text-base">Default body — 14px Regular (--text-base)</p>
          <p className="text-sm">Small — 13px (--text-sm)</p>
          <p className="text-xs uppercase" style={{ letterSpacing: "var(--tracking-wider)" }}>
            Overline — 12px uppercase wider
          </p>
          <p className="text-xs text-muted-foreground">Caption — 12px muted</p>
        </div>
      </Section>

      <Section title="Mono (JetBrains Mono)">
        <p className="font-mono text-sm">
          {"const accent = "}
          <span className="text-[var(--accent)]">"#7cb0ff"</span>
          {";"}
        </p>
        <p className="mt-2">
          Inline <code>code snippet</code> rendering.
        </p>
      </Section>

      <Section title="Text colors">
        <div className="space-y-2">
          <p className="text-foreground">text-foreground — Primary text (--ink)</p>
          <p className="text-muted-foreground">text-muted-foreground — Secondary text (--ink-soft)</p>
          <p className="text-primary">text-primary — Links &amp; accents (--accent)</p>
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

      <Section title="Border radius">
        <div className="flex flex-wrap items-end gap-6">
          {[
            ["xs", "rounded-[var(--radius-xs)]", "4px"],
            ["sm", "rounded-sm", "6px"],
            ["md", "rounded-md", "8px (default)"],
            ["lg", "rounded-lg", "12px"],
            ["xl", "rounded-xl", "16px"],
            ["full", "rounded-full", "9999px"],
          ].map(([label, cls, value]) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className={`size-14 border-2 border-primary bg-secondary ${cls}`} />
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[10px] text-muted-foreground">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing scale">
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
/*  Motion                                                            */
/* ------------------------------------------------------------------ */

export const Motion: Story = {
  render: () => (
    <div className="max-w-3xl space-y-10 p-6">
      <div>
        <h1 className="display-title mb-1 text-2xl font-bold">Motion</h1>
        <p className="text-sm text-muted-foreground">
          Speed-first durations and easings. <code>prefers-reduced-motion</code> clamps everything to ~0ms.
        </p>
      </div>

      <Section title="Durations">
        <table className="w-full text-sm">
          <tbody>
            {[
              ["--motion-fast", "120ms", "Hover / active states"],
              ["--motion-base", "180ms", "Default transitions"],
              ["--motion-slow", "260ms", "Drawers / sheets"],
              ["--motion-deliberate", "400ms", "Page-level transitions (rare)"],
            ].map(([token, value, use]) => (
              <tr key={token} className="border-b border-border last:border-0">
                <td className="py-2 font-mono text-xs">{token}</td>
                <td className="py-2 font-mono text-xs">{value}</td>
                <td className="py-2 text-muted-foreground">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Easings">
        <table className="w-full text-sm">
          <tbody>
            {[
              ["--ease-out", "cubic-bezier(0.2, 0.8, 0.2, 1)", "Default for entrances"],
              ["--ease-in-out", "cubic-bezier(0.4, 0, 0.2, 1)", "Two-way transforms"],
              ["--ease-spring", "cubic-bezier(0.34, 1.56, 0.64, 1)", "Optional micro-interactions"],
            ].map(([token, value, use]) => (
              <tr key={token} className="border-b border-border last:border-0">
                <td className="py-2 font-mono text-xs">{token}</td>
                <td className="py-2 font-mono text-[11px]">{value}</td>
                <td className="py-2 text-muted-foreground">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

      <Section title="Surface card">
        <p className="mb-3 text-sm text-muted-foreground">
          <code>.surface-card</code> — Card background, border, and radius. Used for content containers.
        </p>
        <div className="surface-card p-6">
          <p className="text-sm font-semibold">Card title</p>
          <p className="mt-1 text-sm text-muted-foreground">Card content using the surface-card utility class.</p>
        </div>
      </Section>

      <Section title="Page wrap">
        <p className="mb-3 text-sm text-muted-foreground">
          <code>.page-wrap</code> — Max 1560px, centered, with responsive side padding.
        </p>
        <div className="rounded-lg border border-dashed border-border p-4">
          <div className="rounded bg-primary/10 px-4 py-3 text-center text-xs text-muted-foreground">
            max-width: min(1560px, calc(100% - 2rem))
          </div>
        </div>
      </Section>

      <Section title="Feature grid">
        <p className="mb-3 text-sm text-muted-foreground">
          Border-separated grid using <code>bg-border gap-px</code> with card-coloured children.
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

      <Section title="Page header pattern">
        <p className="mb-3 text-sm text-muted-foreground">Consistent page header: overline, display title, subtitle.</p>
        <div className="rounded-lg border border-dashed border-border p-6">
          <p
            className="mb-3 text-xs font-semibold uppercase text-primary"
            style={{ letterSpacing: "var(--tracking-wider)" }}
          >
            Section label
          </p>
          <h2 className="display-title text-3xl font-semibold sm:text-4xl">Page title</h2>
          <p className="mt-2 text-sm text-muted-foreground">Subtitle or description text explaining this section.</p>
        </div>
      </Section>

      <Section title="Nav link">
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
