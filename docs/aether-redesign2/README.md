# aether-redesign2

Standalone HTML+React prototype of the Workflows page from the Console design
direction (Blueprint dark / Paper light). Use it as a primitives bench — pick
components out of `components/` to port into the real app.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
npx serve docs/aether-redesign2
# then open http://localhost:3000
```

No build step. React 18 + Babel standalone are loaded from a CDN and `.jsx`
files are transpiled in the browser. This matches the original design bundle
so the components stay readable next to the source they came from.

## What's here

- `index.html` — bootstraps React, mounts `<App />`
- `tokens.jsx` — `consoleTokens` design tokens, the two locked palettes
  (paper / blueprint), the `applyTokens()` re-skin helper
- `data.jsx` — mock `WORKFLOWS` and `RUN_ROWS`
- `app.jsx` — `<App />` shell, theme state, `<WorkflowsPage />`
- `components/`
  - `TopBar.jsx` — product name, nav, status counters, sun/moon toggle
  - `PageHeader.jsx` — eyebrow + accent rule + title + actions slot
  - `SectionLabel.jsx` — uppercase mono section headers w/ rule
  - `StatsStrip.jsx` — 4-up KPI tiles
  - `Atoms.jsx` — `WBadge`, `WButton`, `WChip`, `WIcon`
  - `Alert.jsx` — `WAlert` (info / success / warn / error)
  - `Form.jsx` — `WLabel`, `WField`, `WInput`, `WTextarea`, `WSelect`
  - `WorkflowCard.jsx` — workflow card w/ status badge, chips, run button
  - `RunTable.jsx` — recent runs table w/ monospace columns
  - `RunWorkflowForm.jsx` — composed form using the form atoms

## Theme

Two locked palettes:

- **paper** — light, default
- **blueprint** — dark, accent `#7cb0ff`

Toggle via the sun/moon button in the top bar. State is held in `<App />` and
flows down via `applyTokens(palette)` before each render.

## Porting notes

- Every component reads from a shared mutable `consoleTokens` object — that's
  how palette swapping works without a Context. When you port to the real
  app, swap to CSS variables (or pass tokens via context) so the components
  don't depend on a global.
- All inputs use mono font for the terminal feel; focus rings use the active
  accent so forms re-skin with the palette.
- Components use inline styles (matching the design bundle). Convert to
  Tailwind / CSS variables when porting — the visual output is the spec, not
  the styling approach.
