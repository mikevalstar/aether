# Obsidian Vault Browser Lifecycle

How Obsidian vault documents are discovered, viewed, edited, and created through the `/o/` UI, including the special AI Config and AI Memory sections.

## Overview

The Obsidian integration gives a web-based browser for the local Obsidian vault configured via `OBSIDIAN_DIR`. The server recursively scans the vault, parses markdown with `gray-matter`, and serves a tree + document view. Documents can be viewed (with rendered markdown) and edited (with a lazy-loaded markdown editor). Two special directories — **AI Config** and **AI Memory** — are separated in the sidebar and receive extra treatment: config files get live validation against registered validators, and memory files serve as the AI's persistent note storage.

## Key Files

| Area | File | Purpose |
|------|------|---------|
| **Types** | `src/lib/obsidian.ts` | `ObsidianTreeNode`, `ObsidianDocument`, `ObsidianViewerData` types; link resolution; route path normalization |
| **Server functions** | `src/lib/obsidian.functions.ts` | `getObsidianViewerData`, `saveObsidianDocument`, `createObsidianFile`, `listObsidianTemplates`, `listObsidianFolders` |
| **Route — index** | `src/routes/o/index.tsx` | `/o` — vault root, shows welcome page |
| **Route — document** | `src/routes/o/$.tsx` | `/o/$path` — catch-all for viewing/editing any document |
| **UI — viewer** | `src/components/obsidian/ObsidianViewer.tsx` | Main orchestrator: switches between view, edit, welcome, missing states |
| **UI — editor** | `src/components/obsidian/ObsidianEditor.tsx` | Markdown editor with save, Cmd+S, AI config validation panel |
| **UI — tree nav** | `src/components/obsidian/ObsidianTreeNav.tsx` | Sidebar with search, collapsible folders, AI Config/Memory sections |
| **UI — welcome** | `src/components/obsidian/ObsidianWelcome.tsx` | Index page showing file/folder counts |
| **UI — missing** | `src/components/obsidian/ObsidianMissingDocument.tsx` | 404 state for non-existent documents |
| **UI — new file** | `src/components/obsidian/NewFileDialog.tsx` | Dialog for creating files with folder picker and templates |
| **AI config — reader** | `src/lib/ai-config.ts` | `readAiConfig()`, `readSystemPrompt()`, `readTitlePromptConfig()`, `readTaskPromptConfig()`, `readWorkflowPromptConfig()` |
| **AI config — shared** | `src/lib/ai-config.shared.ts` | `parseAndValidateAiConfig()` — parses frontmatter and runs validator |
| **AI config — validators** | `src/lib/ai-config-validators/index.ts` | Registry of validators; `getValidatorForFile()` lookup |
| **AI config — server fns** | `src/lib/ai-config.functions.ts` | `validateAiConfigContent`, `getAiConfigValidatorInfo` server functions |
| **Vault index** | `src/lib/obsidian/vault-index.ts` | `fuse.js` full-text index with `chokidar` file watcher (used by AI tools, not the browser UI) |
| **Templates** | `src/lib/obsidian/templates/` | Built-in markdown templates for new file creation |

## 1. Configuration

Three environment variables control the integration:

| Variable | Purpose | Default |
|----------|---------|---------|
| `OBSIDIAN_DIR` | Absolute path to the vault root | _(empty — disables feature)_ |
| `OBSIDIAN_AI_CONFIG` | Relative path for the AI config directory | _(empty)_ |
| `OBSIDIAN_AI_MEMORY` | Relative path for the AI memory directory | _(empty)_ |

If `OBSIDIAN_DIR` is unset, the viewer returns `configured: false` and the UI shows a "not configured" message.

## 2. Route Loading

Both routes (`/o` and `/o/$`) follow the same pattern:

1. `beforeLoad` calls `getSession()` — redirects to `/login` if unauthenticated
2. `loader` calls `getObsidianViewerData()` with the requested path (empty string for index, splat param for documents)
3. The route component renders `ObsidianViewer` with the loader data

The `/o/$` route also validates an optional `?edit=true` search param via Zod, which triggers the editor on initial load.

## 3. Tree Discovery

`getObsidianViewerData()` in `src/lib/obsidian.functions.ts` orchestrates discovery:

1. Checks `OBSIDIAN_DIR` — returns unconfigured state if empty
2. Calls `discoverObsidianTree()` which runs `buildTree()` recursively
3. `buildTree()` reads each directory with `fs.readdir()`:
   - **Skips** dotfiles (names starting with `.`)
   - **Directories**: recurses, then adds as folder node if children exist (empty folders are excluded)
   - **Files**: only includes `.md` files; reads each with `gray-matter` to extract frontmatter and body
4. Each folder node is tagged with `isAiConfig` / `isAiMemory` booleans by comparing its normalized path against `OBSIDIAN_AI_CONFIG` / `OBSIDIAN_AI_MEMORY`
5. Nodes are sorted folders-first, then alphabetically within each group
6. The requested document is found by matching `routePath` against the discovered documents list

### Route path normalization

`toObsidianRoutePath()` in `src/lib/obsidian.ts` converts filesystem relative paths to URL-safe route paths by stripping the `.md` extension and normalizing separators. `normalizeObsidianRoutePath()` handles the reverse — cleaning user input, decoding URI components, and resolving `..` segments (returning `null` for path traversal attempts).

## 4. Viewing a Document

`ObsidianViewer` in `src/components/obsidian/ObsidianViewer.tsx` renders one of four states:

| State | Condition | Rendered component |
|-------|-----------|-------------------|
| Not configured | `data.configured === false` | Inline error message |
| Welcome | `requestedPath === ""` | `ObsidianWelcome` — vault stats |
| Missing | Document is null | `ObsidianMissingDocument` — 404 with back link |
| Document | Document exists | `DocumentContent` (view) or `ObsidianEditor` (edit) |

### Document rendering

`DocumentContent` renders three sections:

1. **Header** — title (from frontmatter or humanized filename), relative path, Edit button, teal-to-coral gradient bar
2. **Frontmatter** — key/value pairs displayed as a compact `<dl>`, excluding the `title` field. Dates are formatted as ISO strings, arrays as comma-separated values
3. **Markdown body** — rendered with `react-markdown` + `remark-gfm`. Custom components handle:
   - **Links**: `MarkdownAnchor` calls `resolveObsidianLinkTarget()` to convert relative/wiki-style links into internal `<Link>` navigation via `ObsidianNavLink`. External links get `target="_blank"`
   - **Code blocks**: `CodeBlockPre` with syntax highlighting

### AI Config detection in view mode

When viewing a document inside the AI Config directory, `DocumentContent` calls `getAiConfigValidatorInfo()` on mount. If no validator is found for the file, an amber warning banner appears: "X is not a recognized config file and will not be used by Aether."

## 5. Tree Navigation Sidebar

`ObsidianTreeNav` in `src/components/obsidian/ObsidianTreeNav.tsx` provides the left sidebar:

### Search
Client-side filtering by title and filename via `filterTree()`. When searching, all folders with matching descendants are auto-expanded.

### Folder expansion
- Expanded state persisted to `localStorage` under key `aether:obsidian:expanded`
- Auto-expands ancestor folders of the currently viewed document on mount and on navigation

### Three sections
The tree is split into up to three visually distinct sections:

1. **AI Config** — coral-highlighted section with sparkles icon. Only appears if a folder with `isAiConfig: true` exists in the tree
2. **AI Memory** — teal-highlighted section with brain icon. Only appears if a folder with `isAiMemory: true` exists
3. **Main files** — all remaining folders and files, in a scrollable `<nav>`

### New File button
Opens `NewFileDialog` which provides:
- **Filename** input (`.md` auto-appended)
- **Folder** combobox with all vault folders + inline new folder creation
- **Template** dropdown from `listObsidianTemplates()` (user vault templates or built-in defaults)

After creation, navigates to the new file with `?edit=true`.

## 6. Editing a Document

Clicking the Edit button (or arriving via `?edit=true`) switches `ObsidianViewer` to render `ObsidianEditor`.

### Editor component

`ObsidianEditor` in `src/components/obsidian/ObsidianEditor.tsx`:

1. Initializes local `content` state from `document.rawContent`
2. Lazy-loads `MarkdownEditor` component via `React.lazy()`
3. Tracks `hasChanges` by comparing current content to original
4. Shows "Unsaved" badge in coral when changes exist

### Save flow

1. User clicks Save button or presses **Cmd+S** / **Ctrl+S**
2. `handleSave()` calls `saveObsidianDocument()` server function
3. Server validates:
   - Path is non-empty, has no `..`, doesn't start with `/`
   - Resolved path stays within vault root (path traversal guard)
4. Reads original content for activity logging (null if new file)
5. Writes content to disk with `fs.writeFile()`
6. Logs the change via `logFileChange()` with `changeSource: "manual"`
7. On success: toast, 600ms delay, then `onSaved()` which exits edit mode and calls `router.invalidate()` to reload data

### AI Config validation in editor

When editing a file inside the AI Config directory:

1. On mount, `getAiConfigFilename()` checks if the file's relative path is under the config directory
2. If it is, `getAiConfigValidatorInfo()` loads the validator's label and description
3. On every content change (debounced 400ms), `validateAiConfigContent()` is called server-side
4. Results render in a bottom panel:
   - **Valid**: green checkmark
   - **Invalid**: red error list with count
   - **Requirements section**: rendered markdown description from the validator
5. If no validator matches the filename, an amber "unrecognized config" banner appears

## 7. Creating a New File

`NewFileDialog` in `src/components/obsidian/NewFileDialog.tsx`:

1. Dialog opens → resets state, fetches templates and folders in parallel
2. User fills filename, selects folder (or types a new one), picks template
3. On submit, calls `createObsidianFile()` server function:
   - Sanitizes filename, appends `.md` if missing
   - Validates path (no traversal, within vault root)
   - Checks file doesn't already exist
   - Loads template content (user vault templates take priority over built-in) and interpolates `{{title}}` and `{{date}}`
   - Creates parent directories with `fs.mkdir({ recursive: true })`
   - Writes file, logs to activity
4. Returns `{ relativePath, routePath }` — client navigates to `getObsidianHref(routePath)` with `?edit=true`

### Template system

Templates are plain markdown files. Built-in templates live in `src/lib/obsidian/templates/`. Users can override by setting `obsidianTemplatesFolder` in their preferences, pointing to a vault-relative folder. The server checks the user's folder first; if it has templates, those are used exclusively.

Template placeholders:
- `{{title}}` — humanized filename (underscores to spaces, title case)
- `{{date}}` — current date as `YYYY-MM-DD`

## 8. Link Resolution

`resolveObsidianLinkTarget()` in `src/lib/obsidian.ts` converts markdown link hrefs into internal routes:

1. **Skip**: empty hrefs, anchor-only (`#...`), external protocols (`http:`, `mailto:`, etc.)
2. **Absolute links** (starting with `/`): used as-is
3. **Relative links**: resolved against the current document's directory
4. **Normalize**: runs through `normalizeObsidianRoutePath()` which strips `.md`, resolves `..`, and handles URI decoding
5. Returns `{ routePath, hash }` — rendered as a TanStack Router `<Link>` via `ObsidianNavLink`

## 9. AI Config Section

The **AI Config** directory (configured via `OBSIDIAN_AI_CONFIG`) stores markdown files that control Aether's AI behavior. These files are edited through the same Obsidian browser UI but receive special treatment.

### Recognized config files

Each config file has a dedicated validator in `src/lib/ai-config-validators/`:

| Filename | Label | Key frontmatter | Placeholders | Read by |
|----------|-------|-----------------|--------------|---------|
| `system-prompt.md` | System Prompt | _(none required)_ | `{{date}}`, `{{userName}}`, `{{aiMemoryPath}}` | `readSystemPrompt()` — chat system prompt |
| `title-prompt.md` | Title Prompt | `model` | _(none)_ | `readTitlePromptConfig()` — thread title generation |
| `task-prompt.md` | Task Prompt | `model`, `effort` | `{{date}}`, `{{userName}}`, `{{aiMemoryPath}}` | `readTaskPromptConfig()` — scheduled task system prompt |
| `workflow-prompt.md` | Workflow Prompt | `model`, `effort` | `{{date}}`, `{{userName}}`, `{{aiMemoryPath}}` | `readWorkflowPromptConfig()` — workflow system prompt |
| `tasks/*` | Task definition | _(per task validator)_ | — | Task scheduler |
| `workflows/*` | Workflow definition | _(per workflow validator)_ | — | Workflow executor |

### Validation flow

Validators are registered in `src/lib/ai-config-validators/index.ts`. Each implements the `AiConfigValidator` interface:

- `filename` — exact filename (e.g. `system-prompt.md`) or directory prefix (e.g. `tasks/`)
- `label` — human-readable name shown in the UI
- `description` — markdown describing requirements, rendered in the editor's bottom panel
- `validate(frontmatter, body)` — returns `{ isValid, errors[] }`

`getValidatorForFile()` matches by exact filename first, then by directory prefix. Files with no matching validator are flagged as "unrecognized" in the UI.

### How configs are consumed

`readAiConfig()` in `src/lib/ai-config.ts` reads a file from the config directory, parses it with `gray-matter`, and runs the matching validator. Higher-level functions like `readSystemPrompt()` handle placeholder interpolation and fallback to hardcoded defaults when the file is missing or invalid.

## 10. AI Memory Section

The **AI Memory** directory (configured via `OBSIDIAN_AI_MEMORY`) is the AI's persistent note storage. It appears in the sidebar with a teal brain icon.

### Purpose

AI Memory files are created and managed by the AI during chat conversations using Obsidian tools (`obsidian_write`, `obsidian_edit`). They serve as the AI's long-term memory across conversations — storing notes about user preferences, project context, templates, and task-related information.

### Structure

The AI Memory directory typically contains subfolders like:
- `notes/` — general persistent notes
- `templates/` — AI-managed templates
- `tasks/` — task-related notes
- `workflows/` — workflow-related notes

### UI treatment

In the browser UI, AI Memory files are **browsed and edited exactly like any other vault document** — the only difference is visual: they appear in a separate teal-highlighted section at the top of the sidebar. There is no special validation (unlike AI Config files). Users can freely view and edit these files to review or correct what the AI has stored.

### AI access

The AI interacts with memory files through the standard Obsidian tools (`obsidian_search`, `obsidian_read`, `obsidian_write`, `obsidian_edit`) and a dedicated `obsidian_ai_notes_list` tool that lists files specifically within the AI Memory folder. The system prompt (from AI Config) tells the AI where memory files are stored via the `{{aiMemoryPath}}` placeholder.

## 11. Activity Logging

All document mutations are logged via `logFileChange()`:

| Action | `changeSource` | Logged by |
|--------|---------------|-----------|
| Manual save via editor | `"manual"` | `saveObsidianDocument()` |
| New file creation | `"manual"` | `createObsidianFile()` |
| AI tool write | `"ai"` | Obsidian write/edit tools |

Each log entry captures: `filePath`, `originalContent`, `newContent`, `changeSource`, and a `summary` string.
