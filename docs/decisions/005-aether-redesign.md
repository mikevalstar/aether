---
title: "ADR-005: Aether redesign — single soft-blue accent, light/dark parity"
status: accepted
date: 2026-04-25
---

# ADR-005: Aether redesign — single soft-blue accent, light/dark parity

## Context

The current visual identity is **teal (`oklch(0.55 0.15 180)`) + coral (`oklch(0.70 0.14 25)`) on warm-tinted neutrals**, with light + dark mode supported. It works, but a year in:

- Two accents (teal for primary, coral for secondary) gives every page a chromatic decision to make. In practice the team reaches for teal 95% of the time and coral feels decorative more than meaningful.
- Teal as a "brand link" color competes with established UI conventions (links are blue) — feels slightly off in dense data views like `/usage`, `/activity`, `/logs`.
- The light theme is functional but warm-tinted neutrals (`oklch(... 80)` and `oklch(... 180)`) carry a subtle yellow / cyan cast that fights the redesign artifact's cleaner "paper" palette.
- A new visual direction landed in `docs/aether-redesign.html` (a bundled static artifact). Its `TWEAK_DEFAULTS` set `accent: "#7cb0ff"`, `palette: "paper"`, `displayFont: "inter"`, and the embedded base style is `background: #0c0d0a` — a near-black dark surface with a soft-blue accent. The artifact also exposes a lime fallback (`#c8ff5a`) that we are explicitly **not** adopting.

We need a deliberate refresh that:

1. Picks one accent, not two.
2. Stays cohesive with chat conventions (assistant-ui's blue links, code-block emphasis) and with broader dev-tool reference points (Linear, Raycast).
3. Keeps both light and dark modes fully supported. `ThemeToggle` and the auto / light / dark Jotai atom must continue to work — this is a personal dashboard and Mike uses both.
4. Lands incrementally — token swap → primitives → shared shells → pages → polish — without breaking the running app between phases.

## Decision

### Accent: `#7cb0ff` (soft blue), single accent across the system

- Replace the current `--teal` + `--coral` pair with a single `--accent` token.
- Per-mode values: dark uses `#7cb0ff` directly (the artifact's value, contrast 9.8:1 on `#0c0d0a`). Light uses `#3d7fd9`, a darker shade that hits AA (4.6:1) on `#faf9f5` so links and small UI text stay readable.
- Override the artifact's lime (`#c8ff5a`) — too aggressive for an information-dense console, fights with the `--success` semantic.
- Coral is retired. Status colors (`--destructive`, `--success`, `--warning`) cover everything that previously needed a "second color." Charts get a 5-stop sequence built around the accent (see `tokens.md` §1.5).

Rationale:

- Soft blue lines up with link conventions and the assistant-ui chat surface, so accent-on-link no longer fights muscle memory.
- Single accent simplifies design choices — we don't have to decide "is this a teal moment or a coral moment?" on every component.
- `#7cb0ff` is gentle enough not to vibrate against dark surfaces, dark enough (in its `#3d7fd9` light variant) to read as primary on white.

### Light + dark are both first-class

Both modes ship together at every phase. No de-scoping light mode.

- Both palettes are designed from the artifact (artifact's `palette: "paper"` defines light tier; embedded `#0c0d0a` body bg defines dark tier).
- `ThemeProvider` + `ThemeToggle` keep working unchanged — only token **values** move; token **names** (`:root` / `.dark` swap pattern) are preserved.
- Every component is verified in both modes during Phase 3, not as an afterthought.
- Default mode and "auto" detection behavior do not change.

Rationale: Mike uses both modes (dark by default at night, light during the day on the laptop). Treating one as second-class would degrade the dashboard for half its actual usage.

### Typography swap

- UI / body: **Manrope → Inter** (artifact bundles Inter weights 400, 450, 500, 600, 700).
- Display: **Fraunces** retained.
- Mono: system stack → **JetBrains Mono**.
- Space Grotesk reserved for a possible later display variant; not loaded in Phase 1.

Default body font size drops to **14px** (`--text-base = 0.875rem`) consistent with the "density over whitespace" principle in `CLAUDE.md`. Settings + chat composer override to 16px for comfort.

### Surfaces, radii, shadows, motion

Captured in `docs/redesign/tokens.md`. Highlights:

- Three-tier neutral system (`--bg` / `--surface` / `--raised`).
- Dark neutrals shift from blue-tinted (`oklch(... 180)`) to nearly-pure low-chroma (`oklch(... 260)` at 0.005 chroma) to match the artifact's true near-black.
- Radii tighten slightly (default `0.5rem`, with a `0.375rem` step for inputs) for a sharper Linear/Raycast feel.
- Motion durations: `120ms` / `180ms` (default) / `260ms` / `400ms` with `cubic-bezier(0.2, 0.8, 0.2, 1)` ease-out as the default. `prefers-reduced-motion` clamps to `0.01ms`.

### Phased rollout

Phases mirror the FP issue tree under `AETH-kchrwcqx`:

- **Phase 0 — Audit & token extraction** (this ADR + `tokens.md` + `component-audit.md`). Decides direction. No code changes.
- **Phase 1 — Foundation** (AETH-pvgvavqp). Replace palette in `styles.css`, update Tailwind `@theme`, swap fonts, refresh Shadcn primitives, update `AppLogo` to the æ mark from the artifact. App still works, looks transitional.
- **Phase 2 — Shared shells** (AETH-ysdhwcfg). Land `DetailPageShell`, `SettingsFormSection`, `FilterBar`; re-skin `__root` / `Header` / `Footer` / `CommandPalette` / `NotificationBell` / assistant-ui chat surface and shared run-history + markdown surfaces. (Scope per `component-audit.md` §5.)
- **Phase 3 — Page-by-page** (AETH-nruzasvg). Apply the new shells per route, verifying both light and dark.
- **Phase 4 — Polish** (AETH-vkzscqan). Remove old tokens (`--teal*`, `--coral*`), motion pass, accessibility & contrast audit, Storybook coverage sweep, docs.

Each phase ends with the app working in both modes. We don't merge "phase 1 done but light mode is broken" — light/dark parity is a release gate at every step.

### Tokens being removed

- `--teal`, `--teal-hover`, `--teal-subtle`
- `--coral`, `--coral-hover`
- Tailwind `@theme` `--color-teal*` / `--color-coral` aliases
- The Manrope `@import` in `styles.css`

Tracked under AETH-jygeoonx (Phase 4 cleanup) so the token sweep is the *last* thing to land — old code keeps compiling against `--teal` until call-sites are migrated.

## Consequences

### Positive

- One accent → fewer per-component design decisions, more visually cohesive product.
- Light/dark parity locked in by process (release gate per phase) — won't regress like it could under a "dark-first" strategy.
- Inter + JetBrains Mono are widely-loved, long-cached on most machines, and ship from the artifact's bundled weights.
- Phased rollout means the app keeps shipping during the redesign — no big-bang merge.
- `tokens.md` and `component-audit.md` give Phase 1+ work a clear contract; subagents can pick up individual issues without re-deriving direction.

### Negative

- Anything that currently consumes `--teal` / `--coral` directly (a handful of inline `var(--teal)` calls in `GlowBg` color props, `SectionLabel` color literals, dashboard widgets) needs a sweep. Tracked in the Phase 1 issues.
- Storybook stories that hardcode color hexes will need spot fixes (Phase 4).
- `CLAUDE.md` "Color Palette — Teal + Coral" section becomes stale and needs to be rewritten as part of Phase 4 docs cleanup.
- Two-accent designs that depended on coral as a "second voice" (e.g. the dashboard chart cards) lose that lever — they'll lean on the chart palette and `--success` / `--warning` semantics instead.

### Neutral

- Existing `:root` / `.dark` swap pattern is preserved; `ThemeProvider` and `ThemeToggle` need zero code changes.
- Shadcn alias tokens (`--primary`, `--card`, etc.) keep their names; only the brand tokens they alias change.

## Alternatives considered

- **Keep teal + coral, just retune values.** Rejected. The two-accent fatigue is the actual problem; retoning doesn't fix it.
- **Adopt the artifact's lime (`#c8ff5a`) as accent.** Rejected. Too aggressive against dense tabular data, fights `--success`, doesn't match the calmer "personal dashboard" tone.
- **Dark-only redesign, drop light mode.** Rejected. Mike actually uses light mode daily; dropping it would degrade real usage. Overhead of designing both is small once tokens are factored.
- **Defer the typography swap to a later phase.** Rejected. Inter is already in the artifact bundle and Manrope/Inter swap is mechanical — bundling it with the palette swap means one visual jolt instead of two.

## References

- `docs/aether-redesign.html` — source artifact (`TWEAK_DEFAULTS`, embedded fonts + base style).
- `docs/redesign/tokens.md` — finalized token spec for both modes.
- `docs/redesign/component-audit.md` — current-state component inventory and Phase 2 extraction targets.
- FP epic: AETH-kchrwcqx and its phase children (AETH-lqliwqbq Phase 0, AETH-pvgvavqp Phase 1, AETH-ysdhwcfg Phase 2, AETH-nruzasvg Phase 3, AETH-vkzscqan Phase 4).
