# Storybook Organization

Stories are organized into three top-level groups that separate concerns by abstraction level.

## Structure

### Design System

Reusable UI primitives with no business logic. These are the building blocks.

| Category | Contents |
|----------|----------|
| **Foundations** | Design tokens (colors, spacing, etc.) |
| **Typography** | Section Label |
| **Layout** | Feature Card, Glow Background |
| **Actions** | Button |
| **Forms** | Input, Textarea, Label, Select, Switch, Slider, DateRangePicker, Markdown Editor |
| **Navigation** | Tabs |
| **Data Display** | Badge, Avatar, Stat Card, Chart Card |
| **Feedback** | Skeleton, Spinner, Toast, Error Display |
| **Overlays** | Dialog, Tooltip |
| **Theme** | ThemeToggle |

### Features

Page-specific components grouped by domain. Each subfolder maps to a route/feature area.

- **Chat** — Empty State, Chat Header, Thread Item
- **Activity** — Activity Table, Activity Detail Dialog, Content View, Diff View
- **Obsidian** — Welcome, Viewer, Tree Nav, Missing Document, New File Dialog
- **Requirements** — Document Header, Meta Pill, Missing Document, Status Badge, Tree Nav
- **Tasks** — Empty State, Task Table, Run History

### Components

Shared components used across multiple features that aren't low-level enough for the design system.

- **Markdown** — Prose renderer, Chat renderer
- **RunMessages** — AI message/tool-call display

## Conventions

- The `title` field in each story's `meta` determines its sidebar location: `"TopGroup/Subgroup/Story Name"`.
- Every story must include `tags: ["autodocs"]` in its meta to auto-generate documentation pages.
- New design system primitives go under `Design System/<category>`.
- New feature components go under `Features/<feature-area>`.
- Shared components that span features go under `Components/`.
