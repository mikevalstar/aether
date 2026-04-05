import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarClock, PlusIcon } from "lucide-react";
import { useState } from "react";
import { ConfigEditorShell } from "#/components/config-editor/ConfigEditorShell";
import { NewTaskDialog } from "#/components/config-editor/NewTaskDialog";
import { TaskFrontmatterDisplay } from "#/components/config-editor/TaskFrontmatterDisplay";
import type { ConfigEditorData } from "#/components/config-editor/types";
import { Button } from "#/components/ui/button";
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
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      <ConfigEditorShell
        data={data}
        navLabel="Tasks"
        navIcon={CalendarClock}
        basePath="/tasks/editor"
        renderFrontmatter={(doc: ObsidianDocument, onRefresh: () => void, editorData: ConfigEditorData) => (
          <TaskFrontmatterDisplay document={doc} onRefresh={onRefresh} userTimezone={editorData.userTimezone} />
        )}
        headerAction={
          <Button variant="outline" size="sm" className="mt-1" onClick={() => setNewOpen(true)}>
            <PlusIcon className="mr-1 size-3.5" />
            New
          </Button>
        }
      />
      <NewTaskDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  );
}
