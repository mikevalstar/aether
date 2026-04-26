# Aether Redesign — Design Tokens

Token spec for the Phase 1 token swap. Drives the rewrite of `src/styles.css` `:root` / `.dark` blocks and the Tailwind v4 `@theme` map.

Source artifact: `docs/aether-redesign.html` (`TWEAK_DEFAULTS` + the embedded `<style>` block — `palette: "paper"`, `accent: "#7cb0ff"`, `displayFont: "inter"`, base body `background: #0c0d0a`, base font Inter). Lime (`#c8ff5a`) is the artifact's fallback accent — **explicitly overridden** to `#7cb0ff` per AETH-mzadfbns.

Light + dark are both first-class. Token names mirror the existing `:root` + `.dark` pattern so the existing `ThemeProvider` swap continues to work without code changes — only values move.

---

## 1. Color tokens

### 1.1 Accent (shared concept, per-mode value)

The single accent for the whole app. Replaces the current `--teal` + `--coral` pair. There is no secondary accent — destructive and success cover everything else semantically.

| Token | Light value | Dark value | Notes |
|---|---|---|---|
| `--accent` | `#3d7fd9` (`oklch(0.58 0.16 255)`) | `#7cb0ff` (`oklch(0.76 0.13 255)`) | Light uses a darker shade so body-text links and small UI hit AA against `--bg`. Dark uses the artifact base `#7cb0ff` directly. |
| `--accent-hover` | `#2d6dc7` (`oklch(0.52 0.17 255)`) | `#9bc3ff` (`oklch(0.82 0.10 255)`) | Use on `:hover` / `:focus` for buttons + links. |
| `--accent-subtle` | `#e7f0ff` (`oklch(0.95 0.03 255)`) | `#1a2540` (`oklch(0.24 0.04 255)`) | Tinted background for selected rows, active nav, badge bg. |
| `--accent-foreground` | `#ffffff` | `#0c0d0a` | Text color drawn on a solid `--accent` fill. |
| `--ring` | `#3d7fd9 / 30%` | `#7cb0ff / 40%` | Focus ring. |

**Contrast check (target AA 4.5:1 for body text, 3:1 for large/UI):**
- Light: `#3d7fd9` on `#faf9f5` ≈ 4.6:1 ✓
- Dark:  `#7cb0ff` on `#0c0d0a` ≈ 9.8:1 ✓
- Light: `#ffffff` on `#3d7fd9` ≈ 4.7:1 ✓ (button label)
- Dark:  `#0c0d0a` on `#7cb0ff` ≈ 9.8:1 ✓ (button label)

### 1.2 Surfaces

Three-tier neutral system: `bg` (page) → `surface` (card) → `raised` (popovers, dropdowns, dialog content). Light tier is the artifact's "paper" palette (warm off-white). Dark tier is the artifact's near-black `#0c0d0a` plus two stops up.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#faf9f5` (`oklch(0.985 0.005 85)`) | `#0c0d0a` (`oklch(0.135 0.003 95)`) |
| `--surface` | `#ffffff` (`oklch(1 0 0)`) | `#15161a` (`oklch(0.175 0.004 260)`) |
| `--raised` | `#ffffff` (`oklch(1 0 0)`) | `#1c1d22` (`oklch(0.215 0.005 260)`) |
| `--line` | `#e8e6dd` (`oklch(0.92 0.008 85)`) | `#26272d` (`oklch(0.27 0.006 260)`) |
| `--line-strong` | `#d6d3c7` (`oklch(0.85 0.012 85)`) | `#383941` (`oklch(0.36 0.008 260)`) |
| `--header-bg` | `#faf9f5 / 92%` | `#0c0d0a / 92%` |

Notes:
- The light surfaces drop the cool 180-hue tint we have today; replaced with a warm 85-hue paper feel matching the artifact's `#faf9f5`.
- Dark neutrals shift from blue-tinted (current `oklch(... 180)`) to nearly-pure (`260` hue, very low chroma) — closer to the artifact's `#0c0d0a` true near-black.

### 1.3 Ink (text levels)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#0c0d0a` (`oklch(0.18 0.005 95)`) | `#f5f5f2` (`oklch(0.96 0.003 95)`) | Primary text, headings. |
| `--ink-soft` | `#4a4b48` (`oklch(0.45 0.005 95)`) | `#a8a9a3` (`oklch(0.72 0.005 95)`) | Body, secondary labels. |
| `--ink-dim` | `#7a7b77` (`oklch(0.6 0.004 95)`) | `#6a6b66` (`oklch(0.5 0.005 95)`) | Tertiary, captions, placeholders. |
| `--ink-faint` | `#a3a39e` (`oklch(0.72 0.004 95)`) | `#46474a` (`oklch(0.4 0.005 260)`) | Disabled, dividers as text. |

### 1.4 Status

| Token | Light | Dark |
|---|---|---|
| `--destructive` | `#c5392f` (`oklch(0.55 0.20 27)`) | `#e57368` (`oklch(0.7 0.17 27)`) |
| `--destructive-hover` | `#a82e26` (`oklch(0.48 0.21 27)`) | `#ef8a80` (`oklch(0.76 0.16 27)`) |
| `--destructive-subtle` | `#fdecea` (`oklch(0.95 0.03 27)`) | `#3a1c1a` (`oklch(0.26 0.06 27)`) |
| `--destructive-foreground` | `#ffffff` | `#0c0d0a` |
| `--success` | `#2f855a` (`oklch(0.55 0.13 155)`) | `#5fb589` (`oklch(0.72 0.13 155)`) |
| `--success-subtle` | `#e6f4ec` (`oklch(0.95 0.03 155)`) | `#1a2e25` (`oklch(0.25 0.04 155)`) |
| `--warning` | `#a16207` (`oklch(0.6 0.12 70)`) | `#d4a04a` (`oklch(0.76 0.13 70)`) |
| `--warning-subtle` | `#fdf6e3` (`oklch(0.96 0.04 90)`) | `#2e2516` (`oklch(0.25 0.04 70)`) |

### 1.5 Charts (5-stop sequence)

Built around the accent so visual data feels native to the brand.

| Token | Light | Dark |
|---|---|---|
| `--chart-1` | `#3d7fd9` | `#7cb0ff` (accent) |
| `--chart-2` | `#7a4fd1` | `#a991ff` (purple) |
| `--chart-3` | `#2f855a` | `#5fb589` (green) |
| `--chart-4` | `#c5392f` | `#e57368` (red) |
| `--chart-5` | `#a16207` | `#d4a04a` (amber) |

---

## 2. Typography (theme-independent)

The artifact bundles four faces. We adopt the primary three; Space Grotesk is held in reserve for a possible "display" variant later.

| Role | Font | Token |
|---|---|---|
| UI / body | **Inter** (400, 450, 500, 600, 700) | `--font-sans` |
| Display / headings | **Fraunces** (400, 500, 600) | `--font-display` |
| Code / mono | **JetBrains Mono** (400, 500, 600) | `--font-mono` |
| (reserved) | Space Grotesk | — |

This is a swap from the current Manrope (UI) — Inter ships with the artifact's webfont set and matches the redesign target. Fraunces stays as the display face (no change). Mono swaps from the system stack to JetBrains Mono.

```css
--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-display: 'Fraunces', ui-serif, Georgia, serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
```

### 2.1 Type scale

Modular scale tuned for an information-dense console. Each step has a paired `line-height`.

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-xs` | `0.75rem` (12px) | `1rem` | Labels, badges, captions |
| `--text-sm` | `0.8125rem` (13px) | `1.125rem` | Body small, table cells |
| `--text-base` | `0.875rem` (14px) | `1.25rem` | **Default body** (denser than 16px) |
| `--text-md` | `1rem` (16px) | `1.5rem` | Comfortable body, forms |
| `--text-lg` | `1.125rem` (18px) | `1.5rem` | Subheadings |
| `--text-xl` | `1.375rem` (22px) | `1.75rem` | Section titles |
| `--text-2xl` | `1.75rem` (28px) | `2rem` | Page titles |
| `--text-3xl` | `2.25rem` (36px) | `2.5rem` | Display, hero |
| `--text-4xl` | `3rem` (48px) | `3.25rem` | Marketing-only |

Note: default body of 14px (vs Tailwind's 16px) reflects the "density over whitespace" principle in `CLAUDE.md`. Settings + chat may override to `--text-md` for comfort.

### 2.2 Weights

`400` (regular), `500` (medium — UI emphasis), `600` (semibold — headings), `700` (bold — display only).

### 2.3 Tracking

- `--tracking-tight: -0.01em` — display headings
- `--tracking-normal: 0` — body
- `--tracking-wide: 0.02em` — section labels (uppercase eyebrow text)
- `--tracking-wider: 0.08em` — small caps labels

---

## 3. Radius (theme-independent)

Slightly tighter than today's `0.5rem` baseline — sharper feel matching Linear / Raycast references.

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | `0.25rem` (4px) | Badges, tags |
| `--radius-sm` | `0.375rem` (6px) | Inputs, small buttons |
| `--radius-md` | `0.5rem` (8px) | Buttons, dropdowns, **default** |
| `--radius-lg` | `0.75rem` (12px) | Cards, dialogs |
| `--radius-xl` | `1rem` (16px) | Hero panels, large surfaces |
| `--radius-full` | `9999px` | Pills, avatars |

`--radius` (Shadcn alias) maps to `--radius-md`.

---

## 4. Shadows (theme-independent)

Dark-mode shadows use lower opacity since contrast is achieved via surface tier shifts, not drop shadows.

```css
--shadow-xs:  0 1px 2px rgb(0 0 0 / 0.04);
--shadow-sm:  0 1px 3px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04);
--shadow-md:  0 4px 12px rgb(0 0 0 / 0.08), 0 2px 4px rgb(0 0 0 / 0.04);
--shadow-lg:  0 12px 32px rgb(0 0 0 / 0.12), 0 4px 8px rgb(0 0 0 / 0.06);
--shadow-xl:  0 24px 64px rgb(0 0 0 / 0.16), 0 8px 16px rgb(0 0 0 / 0.08);
```

Dark variants drop opacities (`0.04 → 0.25`, `0.08 → 0.4`) and add a 1px inner highlight via `inset 0 1px 0 rgb(255 255 255 / 0.04)` on `--shadow-md`+ to give dark cards lift.

```css
.dark {
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.4), inset 0 1px 0 rgb(255 255 255 / 0.04);
  --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.5), inset 0 1px 0 rgb(255 255 255 / 0.04);
}
```

---

## 5. Spacing scale

Tailwind's default 4px-base scale is kept (no override). One semantic alias added for page gutters:

```css
--page-gutter: 1.5rem;        /* 24px — mobile */
--page-gutter-lg: 2.5rem;     /* 40px — desktop */
--page-max: 80rem;            /* 1280px content cap */
```

---

## 6. Motion (theme-independent)

Aligned with the "speed is a feature" principle — short durations, snappy easings.

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | `120ms` | Hover / active state changes |
| `--motion-base` | `180ms` | Default transitions, button states |
| `--motion-slow` | `260ms` | Drawer / sheet, complex transforms |
| `--motion-deliberate` | `400ms` | Page-level transitions (rare) |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Default for entrances + state changes |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Two-way transforms |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Optional micro-interactions |

`prefers-reduced-motion: reduce` should clamp every duration to `0.01ms` and disable spring easings (handled in `styles.css`, not here).

---

## 7. Z-index scale

| Token | Value | Use |
|---|---|---|
| `--z-base` | `0` | Default stacking |
| `--z-raised` | `10` | Cards w/ elevation |
| `--z-sticky` | `20` | Sticky headers, sidebar |
| `--z-overlay` | `40` | Drawers, sheets |
| `--z-modal` | `50` | Dialogs |
| `--z-popover` | `60` | Popovers, dropdowns |
| `--z-toast` | `70` | Sonner toasts |
| `--z-tooltip` | `80` | Tooltips |

---

## 8. Mapping to Shadcn tokens

The existing `:root` / `.dark` already aliases Shadcn tokens (`--primary`, `--card`, etc.) onto our brand tokens. The remap stays mechanical:

| Shadcn token | Maps to |
|---|---|
| `--background` | `--bg` |
| `--foreground` | `--ink` |
| `--card` | `--surface` |
| `--card-foreground` | `--ink` |
| `--popover` | `--raised` |
| `--popover-foreground` | `--ink` |
| `--primary` | `--accent` |
| `--primary-foreground` | `--accent-foreground` |
| `--secondary` | `--accent-subtle` |
| `--secondary-foreground` | `--ink` |
| `--muted` | `--surface` (dark: `oklch(0.2 0.005 260)`) |
| `--muted-foreground` | `--ink-soft` |
| `--accent` | `--accent-subtle` |
| `--accent-foreground` | `--ink` |
| `--border` | `--line` |
| `--input` | `--line` |
| `--ring` | `--ring` |
| `--chart-1..5` | `--chart-1..5` |

Sidebar tokens (`--sidebar*`) map the same way as today.

---

## 9. Removal list

Tokens deleted from `styles.css` (Phase 1 alias defs kept for the call-site sweep, removed in Phase 4 / AETH-jygeoonx):

- `--teal`, `--teal-hover`, `--teal-subtle` — call sites renamed to `--accent*`.
- `--coral`, `--coral-hover` — call sites mapped per-context to `--destructive`, `--warning`, `--chart-2`, or `--accent`.
- Tailwind `@theme` `--color-teal*` and `--color-coral` aliases.
- Manrope `@import` (replaced with Inter).

---

## 10. Open questions parked for Phase 1

- Whether to bring the artifact's "Space Grotesk" in as `--font-display` for marketing surfaces (about page) — defer until Phase 3 / About redesign.
- Whether `--text-base` should stay 14px or move to 15px after wearing it for a week — leave at 14px, reassess in Phase 4 polish.
- Glow / backdrop accent overlays (`GlowBg` component) — currently use `--teal`; will consume `--accent` automatically once renamed. No new token needed.
