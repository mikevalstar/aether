import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { ConfigEditorShell } from "#/components/config-editor/ConfigEditorShell";
import { TaskFrontmatterDisplay } from "#/components/config-editor/TaskFrontmatterDisplay";
import { getSession } from "#/lib/auth.functions";
import { getConfigEditorData } from "#/lib/config-editor/config-editor.functions";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";

export const Route = createFileRoute("/tasks/editor/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    return await getConfigEditorData({ data: { subfolder: "tasks" } });
  },
  component: TaskEditorPage,
});

function TaskEditorPage() {
  const data = Route.useLoaderData();

  return (
    <ConfigEditorShell
      data={data}
      navLabel="Tasks"
      navIcon={CalendarClock}
      basePath="/tasks/editor"
      renderFrontmatter={(doc: ObsidianDocument, onRefresh: () => void) => (
        <TaskFrontmatterDisplay document={doc} onRefresh={onRefresh} />
      )}
    />
  );
}
