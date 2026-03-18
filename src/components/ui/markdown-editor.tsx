import type { ICommand } from "@uiw/react-md-editor";
import MDEditor, { commands } from "@uiw/react-md-editor";
import {
  BoldIcon,
  CheckSquareIcon,
  CodeIcon,
  ColumnsIcon,
  EyeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MaximizeIcon,
  MinusIcon,
  PencilIcon,
  QuoteIcon,
  StrikethroughIcon,
  TableIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

// ─── Platform detection ─────────────────────────────────────────────────

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "\u2318" : "Ctrl+";

// ─── Toolbar config ─────────────────────────────────────────────────────

interface ToolbarItem {
  command: ICommand;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

interface ToolbarDivider {
  type: "divider";
}

type ToolbarEntry = ToolbarItem | ToolbarDivider;

const ico = "size-[22px] stroke-[1.5]";

const toolbarLayout: ToolbarEntry[] = [
  {
    command: commands.bold,
    icon: <BoldIcon className={ico} />,
    label: "Bold",
    shortcut: `${modKey}B`,
  },
  {
    command: commands.italic,
    icon: <ItalicIcon className={ico} />,
    label: "Italic",
    shortcut: `${modKey}I`,
  },
  {
    command: commands.strikethrough,
    icon: <StrikethroughIcon className={ico} />,
    label: "Strikethrough",
  },
  { type: "divider" },
  {
    command: commands.title1,
    icon: <Heading1Icon className={ico} />,
    label: "Heading 1",
  },
  {
    command: commands.title2,
    icon: <Heading2Icon className={ico} />,
    label: "Heading 2",
  },
  {
    command: commands.title3,
    icon: <Heading3Icon className={ico} />,
    label: "Heading 3",
  },
  { type: "divider" },
  {
    command: commands.link,
    icon: <LinkIcon className={ico} />,
    label: "Link",
    shortcut: `${modKey}K`,
  },
  {
    command: commands.image,
    icon: <ImageIcon className={ico} />,
    label: "Image",
  },
  {
    command: commands.code,
    icon: <CodeIcon className={ico} />,
    label: "Code",
  },
  {
    command: commands.quote,
    icon: <QuoteIcon className={ico} />,
    label: "Quote",
  },
  { type: "divider" },
  {
    command: commands.unorderedListCommand,
    icon: <ListIcon className={ico} />,
    label: "Bullet list",
  },
  {
    command: commands.orderedListCommand,
    icon: <ListOrderedIcon className={ico} />,
    label: "Numbered list",
  },
  {
    command: commands.checkedListCommand,
    icon: <CheckSquareIcon className={ico} />,
    label: "Checklist",
  },
  { type: "divider" },
  {
    command: commands.table,
    icon: <TableIcon className={ico} />,
    label: "Table",
  },
  {
    command: commands.hr,
    icon: <MinusIcon className={ico} />,
    label: "Horizontal rule",
  },
];

const editorCommands: ICommand[] = toolbarLayout.map((entry) => {
  if ("type" in entry) return commands.divider;
  const { children, ...rest } = entry.command;
  return { ...rest, icon: entry.icon, name: entry.label } as ICommand;
});

const icoSm = "size-[18px] stroke-[1.5]";

const extraToolbarLayout: ToolbarEntry[] = [
  {
    command: commands.codeEdit,
    icon: <PencilIcon className={icoSm} />,
    label: "Edit",
  },
  {
    command: commands.codeLive,
    icon: <ColumnsIcon className={icoSm} />,
    label: "Split view",
  },
  {
    command: commands.codePreview,
    icon: <EyeIcon className={icoSm} />,
    label: "Preview",
  },
  { type: "divider" },
  {
    command: commands.fullscreen,
    icon: <MaximizeIcon className={icoSm} />,
    label: "Fullscreen",
  },
];

const extraEditorCommands: ICommand[] = extraToolbarLayout.map((entry) => {
  if ("type" in entry) return commands.divider;
  const { children, ...rest } = entry.command;
  return { ...rest, icon: entry.icon, name: entry.label } as ICommand;
});

const toolbarMeta = new Map<string, ToolbarItem>(
  [...toolbarLayout, ...extraToolbarLayout]
    .filter((e): e is ToolbarItem => !("type" in e))
    .map((item) => [item.label, item]),
);

function renderToolbarButton(
  command: ICommand,
  _disabled: boolean,
  executeCommand: (command: ICommand, name?: string) => void,
) {
  if (command.keyCommand === "divider") {
    return <div className="mx-2 h-6 w-px bg-[var(--teal)]/15" />;
  }

  const meta = toolbarMeta.get(command.name ?? "");
  const isExtra = extraToolbarLayout.some((e) => !("type" in e) && e.label === command.name);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-lg text-[var(--ink-soft)] transition-all duration-150 hover:bg-[var(--teal)]/12 hover:text-[var(--teal)] active:scale-90 active:bg-[var(--teal)]/20",
            isExtra ? "size-[32px]" : "size-[38px]",
          )}
          onClick={() => executeCommand(command)}
        >
          {command.icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        <span className="flex items-center gap-2 text-[12px]">
          {command.name}
          {meta?.shortcut && (
            <kbd className="rounded bg-background/20 px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-wide">
              {meta.shortcut}
            </kbd>
          )}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  showStatusBar?: boolean;
  className?: string;
};

export function MarkdownEditor({ value, onChange, showStatusBar = true, className }: MarkdownEditorProps) {
  const stats = useMemo(() => {
    const chars = value.length;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [value]);

  function handleChange(val: string | undefined) {
    onChange(val ?? "");
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex flex-col", className)}>
        <div className="min-h-0 flex-1" data-color-mode="auto">
          <MDEditor
            value={value}
            onChange={handleChange}
            height="100%"
            visibleDragbar={false}
            preview="edit"
            commands={editorCommands}
            extraCommands={extraEditorCommands}
            components={{
              toolbar: renderToolbarButton,
            }}
          />
        </div>

        {showStatusBar && (
          <div className="flex items-center justify-end border-t border-[var(--line)] bg-[var(--teal-subtle)]/40 px-4 py-2">
            <div className="flex items-center gap-3 font-mono text-[11px] font-medium text-[var(--ink-soft)]/70">
              <span>
                {stats.words.toLocaleString()} {stats.words === 1 ? "word" : "words"}
              </span>
              <span className="text-[var(--line)]">/</span>
              <span>{stats.chars.toLocaleString()} chars</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
