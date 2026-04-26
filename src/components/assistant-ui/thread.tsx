import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import { type FC, useCallback, useRef, useSyncExternalStore } from "react";
import { ComposerAddAttachment, ComposerAttachments, UserMessageAttachments } from "#/components/assistant-ui/attachment";
import { MarkdownText } from "#/components/assistant-ui/markdown-text";
import {
  groupConsecutiveToolParts,
  InspectorToolActivity,
  InspectorToolRow,
  ToolInspectorDrawer,
  ToolInspectorProvider,
} from "#/components/assistant-ui/tool-inspector";
import { TooltipIconButton } from "#/components/assistant-ui/tooltip-icon-button";
import { MentionPopover } from "#/components/mentions/MentionPopover";
import { Button } from "#/components/ui/button";
import { useMentionAutocomplete } from "#/hooks/useMentionAutocomplete";
import { cn } from "#/lib/utils";

const GUTTER_WIDTH = "64px";

export const Thread: FC = () => {
  return (
    <ToolInspectorProvider>
      <div className="flex h-full min-h-0 flex-col">
        <ThreadPrimitive.Root
          className="aui-root aui-thread-root @container flex h-full flex-col bg-[var(--bg)]"
          style={{
            ["--thread-max-width" as string]: "62rem",
            ["--thread-gutter" as string]: GUTTER_WIDTH,
            ["--composer-radius" as string]: "8px",
            ["--composer-padding" as string]: "4px",
          }}
        >
          <ThreadPrimitive.Viewport
            turnAnchor="bottom"
            aria-live="polite"
            aria-relevant="additions"
            className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-auto scroll-smooth px-3 pt-4 lg:px-6 lg:pt-6"
          >
            <AuiIf condition={(s) => s.thread.isEmpty}>
              <ThreadWelcome />
            </AuiIf>

            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                EditComposer,
                AssistantMessage,
              }}
            />

            <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mt-auto -mx-3 flex w-auto flex-col gap-2 overflow-visible bg-[var(--bg)] pb-2 lg:mx-auto lg:-mx-0 lg:w-full lg:max-w-(--thread-max-width) lg:pb-4">
              <ThreadScrollToBottom />
              <Composer />
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
        <ToolInspectorDrawer />
      </div>
    </ToolInspectorProvider>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm transition-colors hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mx-auto flex w-full max-w-(--thread-max-width) grow flex-col pt-4">
      <div className="aui-thread-welcome-center flex w-full grow flex-col justify-center px-2">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">AETHER · STANDBY</div>
        <h2 className="font-display fade-in slide-in-from-bottom-1 mt-3 animate-in fill-mode-both text-3xl font-semibold tracking-tight text-[var(--ink)] duration-200">
          Hello there.
        </h2>
        <p className="fade-in slide-in-from-bottom-1 mt-2 animate-in fill-mode-both text-base text-[var(--ink-soft)] delay-75 duration-200">
          How can I help you today?
        </p>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions grid w-full @md:grid-cols-2 gap-2 pb-4">
      <ThreadPrimitive.Suggestions
        components={{
          Suggestion: ThreadSuggestionItem,
        }}
      />
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 @md:nth-[n+3]:block nth-[n+3]:hidden animate-in fill-mode-both duration-200">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion h-auto w-full @md:flex-col flex-wrap items-start justify-start gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left text-sm transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)]"
        >
          <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 font-medium" />
          <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground empty:hidden" />
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const MOBILE_QUERY = "(max-width: 1023px)";
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const getServerSnapshot = () => false;

const Composer: FC = () => {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mentionState, handleMentionInput, handleMentionKeyDown, selectMention } = useMentionAutocomplete({ textareaRef });

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      handleMentionKeyDown(e);
    },
    [handleMentionKeyDown],
  );

  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="composer-shell"
          className="relative flex w-full flex-col rounded-(--composer-radius) border border-[var(--line-strong)] bg-[var(--surface)] p-(--composer-padding) transition-shadow focus-within:border-[var(--accent)]/60 focus-within:ring-2 focus-within:ring-[var(--accent)]/20 data-[dragging=true]:border-[var(--accent)] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[var(--accent-subtle)]"
        >
          <ComposerAttachments />
          <MentionPopover state={mentionState} onSelect={selectMention} />
          <div className="flex items-start gap-2 px-3 py-2">
            <span className="mt-0.5 select-none font-mono text-base font-bold text-[var(--accent)]">{">"}</span>
            <ComposerPrimitive.Input
              ref={textareaRef}
              placeholder="dispatch instruction…"
              className="aui-composer-input max-h-40 min-h-6 flex-1 resize-none bg-transparent font-mono text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
              rows={1}
              submitMode={isMobile ? "none" : "enter"}
              unstable_focusOnScrollToBottom={!isMobile}
              unstable_focusOnRunStart={!isMobile}
              autoFocus={!isMobile}
              aria-label="Message input"
              onKeyDown={onKeyDown}
              onInput={handleMentionInput}
              onClick={handleMentionInput}
            />
          </div>
          <ComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between gap-2 border-t border-[var(--line)] px-2 py-1.5">
      <div className="flex items-center gap-1">
        <ComposerAddAttachment />
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)] lg:inline">
          ⏎ exec · ⇧⏎ newline
        </span>
      </div>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button
            type="button"
            size="sm"
            className="aui-composer-send h-7 rounded bg-[var(--accent)] px-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] active:scale-95"
            aria-label="Send message"
          >
            EXEC ↵
          </Button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="aui-composer-cancel h-7 rounded border-destructive/40 px-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-destructive hover:bg-destructive/10"
            aria-label="Stop generating"
          >
            <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
            STOP
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-assistant-message-root fade-in slide-in-from-bottom-1 relative mx-auto grid w-full max-w-(--thread-max-width) animate-in py-3 duration-150 lg:py-4 grid-cols-[1fr] lg:grid-cols-[var(--thread-gutter)_1fr]"
      data-role="assistant"
    >
      <div className="hidden pt-1 pl-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] lg:block">
        AETHER
      </div>
      <div className="aui-assistant-message-content min-w-0 wrap-break-word px-2 text-[13.5px] text-foreground leading-relaxed lg:text-[15px]">
        <AssistantMessageParts />
        <MessageError />
        <div className="aui-assistant-message-footer mt-1 -ml-1 flex min-h-6 items-center">
          <BranchPicker />
          <AssistantActionBar />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessageParts: FC = () => {
  return (
    <MessagePrimitive.Unstable_PartsGrouped
      groupingFunction={groupConsecutiveToolParts}
      components={{
        Text: MarkdownText,
        Group: InspectorToolActivity,
        tools: { Override: InspectorToolRow },
      }}
    />
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root flex gap-1 text-muted-foreground"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton tooltip="More" className="data-[state=open]:bg-accent">
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border border-[var(--line)] bg-popover p-1 text-popover-foreground shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
              <DownloadIcon className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-(--thread-max-width) animate-in py-2 duration-150 lg:py-3 grid-cols-[1fr_auto] lg:grid-cols-[var(--thread-gutter)_1fr_auto]"
      data-role="user"
    >
      <div className="hidden pt-1 pl-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] lg:block">
        YOU
      </div>
      <UserMessageAttachments />
      <div className="aui-user-message-content-wrapper relative col-start-1 min-w-0 lg:col-start-2">
        <div className="aui-user-message-content wrap-break-word border-l-2 border-[var(--line-strong)] px-3 py-1 text-[13.5px] leading-relaxed text-[var(--ink)] lg:text-[15px]">
          <MessagePrimitive.Parts />
        </div>
      </div>
      <div className="col-start-2 flex items-start pt-0.5 lg:col-start-3">
        <UserActionBar />
      </div>
      <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-2 -mr-1 justify-end lg:col-start-2" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-edit-composer-wrapper mx-auto grid w-full max-w-(--thread-max-width) px-2 py-3"
      style={{ gridTemplateColumns: `var(--thread-gutter) 1fr` }}
    >
      <div className="pt-1 pl-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">YOU</div>
      <ComposerPrimitive.Root className="aui-edit-composer-root flex flex-col rounded-md border border-[var(--line-strong)] bg-[var(--surface)]">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-3 font-mono text-sm text-[var(--ink)] outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer flex items-center justify-end gap-2 border-t border-[var(--line)] px-2 py-1.5">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button
              size="sm"
              className="h-7 rounded bg-[var(--accent)] font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
            >
              UPDATE ↵
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({ className, ...rest }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn("aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-muted-foreground text-xs", className)}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
