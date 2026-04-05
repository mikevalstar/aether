import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlusIcon, Workflow } from "lucide-react";
import { useState } from "react";
import { ConfigEditorShell } from "#/components/config-editor/ConfigEditorShell";
import { NewWorkflowDialog } from "#/components/config-editor/NewWorkflowDialog";
import type { ConfigEditorData } from "#/components/config-editor/types";
import { WorkflowFrontmatterDisplay } from "#/components/config-editor/WorkflowFrontmatterDisplay";
import { Button } from "#/components/ui/button";
import { getSession } from "#/lib/auth.functions";
import { getConfigEditorData } from "#/lib/config-editor/config-editor.functions";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";

export const Route = createFileRoute("/workflows/editor/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    return await getConfigEditorData({ data: { subfolder: "workflows" } });
  },
  component: WorkflowEditorPage,
});

function WorkflowEditorPage() {
  const data = Route.useLoaderData();
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      <ConfigEditorShell
        data={data}
        navLabel="Workflows"
        navIcon={Workflow}
        basePath="/workflows/editor"
        renderFrontmatter={(doc: ObsidianDocument, onRefresh: () => void, _editorData: ConfigEditorData) => (
          <WorkflowFrontmatterDisplay document={doc} onRefresh={onRefresh} />
        )}
        headerAction={
          <Button variant="outline" size="sm" className="mt-1" onClick={() => setNewOpen(true)}>
            <PlusIcon className="mr-1 size-3.5" />
            New
          </Button>
        }
      />
      <NewWorkflowDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  );
}
