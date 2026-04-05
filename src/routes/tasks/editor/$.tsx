import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { ConfigEditorShell } from "#/components/config-editor/ConfigEditorShell";
import { TaskFrontmatterDisplay } from "#/components/config-editor/TaskFrontmatterDisplay";
import type { ConfigEditorData } from "#/components/config-editor/types";
import { getSession } from "#/lib/auth.functions";
import { getConfigEditorData } from "#/lib/config-editor/config-editor.functions";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";

export const Route = createFileRoute("/tasks/editor/$")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ params }) => {
    const filename = params._splat;
    return await getConfigEditorData({ data: { subfolder: "tasks", filename } });
  },
  component: TaskEditorFilePage,
});

function TaskEditorFilePage() {
  const data = Route.useLoaderData();

  return (
    <ConfigEditorShell
      key={data.requestedFilename}
      data={data}
      navLabel="Tasks"
      navIcon={CalendarClock}
      basePath="/tasks/editor"
      renderFrontmatter={(doc: ObsidianDocument, onRefresh: () => void, editorData: ConfigEditorData) => (
        <TaskFrontmatterDisplay document={doc} onRefresh={onRefresh} userTimezone={editorData.userTimezone} />
      )}
    />
  );
}
