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

export const Route = createFileRoute("/workflows/editor/$")({
  validateSearch: (search: Record<string, unknown>) => ({
    configure: search.configure === true || search.configure === "true",
  }),
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ params }) => {
    const filename = params._splat;
    return await getConfigEditorData({ data: { subfolder: "workflows", filename } });
  },
  component: WorkflowEditorFilePage,
});

function WorkflowEditorFilePage() {
  const data = Route.useLoaderData();
  const { configure } = Route.useSearch();
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      <ConfigEditorShell
        key={data.requestedFilename}
        data={data}
        navLabel="Workflows"
        navIcon={Workflow}
        basePath="/workflows/editor"
        renderFrontmatter={(doc: ObsidianDocument, onRefresh: () => void, _editorData: ConfigEditorData) => (
          <WorkflowFrontmatterDisplay document={doc} onRefresh={onRefresh} autoOpenModal={configure} />
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
