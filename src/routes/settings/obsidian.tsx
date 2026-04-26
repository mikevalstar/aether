import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { FieldRow } from "#/components/ui/field-row";
import { Input } from "#/components/ui/input";
import { SectionLabel } from "#/components/ui/section-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { updateUserPreferences } from "#/lib/preferences.functions";

const NO_TEMPLATES_FOLDER = "__bundled__";
const DEFAULT_CHAT_EXPORT_FOLDER = "Aether/Chats/{YYYY}/{MM}";
const settingsRoute = getRouteApi("/settings");

export const Route = createFileRoute("/settings/obsidian")({
  component: ObsidianSection,
});

function ObsidianSection() {
  const data = settingsRoute.useLoaderData();

  const [templatesFolder, setTemplatesFolder] = useState(data.preferences.obsidianTemplatesFolder || NO_TEMPLATES_FOLDER);
  const [chatExportFolder, setChatExportFolder] = useState(
    data.preferences.obsidianChatExportFolder || DEFAULT_CHAT_EXPORT_FOLDER,
  );
  const [isSaving, setIsSaving] = useState(false);

  if (data.obsidianFolders.length === 0) {
    return (
      <div className="surface-card flex flex-col gap-2 p-6">
        <SectionLabel icon={BookOpen}>Obsidian</SectionLabel>
        <p className="text-sm text-muted-foreground">
          No Obsidian vault is configured. Set the vault path to enable Obsidian settings.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
          await updateUserPreferences({
            data: {
              obsidianTemplatesFolder: templatesFolder === NO_TEMPLATES_FOLDER ? undefined : templatesFolder,
              obsidianChatExportFolder: chatExportFolder.trim() || undefined,
            },
          });
          toast.success("Preferences saved");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save preferences");
        } finally {
          setIsSaving(false);
        }
      }}
      className="surface-card flex flex-col gap-5 p-6"
    >
      <header className="flex flex-col gap-1.5">
        <SectionLabel icon={BookOpen}>Obsidian</SectionLabel>
        <p className="text-sm text-muted-foreground">Vault folders used for templates and exported chat threads.</p>
      </header>

      <FieldRow label="TEMPLATES FOLDER">
        <Select value={templatesFolder} onValueChange={setTemplatesFolder}>
          <SelectTrigger className="w-full font-mono text-[12.5px]">
            <SelectValue placeholder="Choose a folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TEMPLATES_FOLDER}>Bundled templates (default)</SelectItem>
            {data.obsidianFolders
              .filter((f) => f !== "")
              .map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose a folder in your Obsidian vault to use as the template source when creating new files.
        </p>
      </FieldRow>

      <FieldRow label="CHAT EXPORT FOLDER" hint={<span>{"{YYYY} {MM} {DD}"} ok</span>}>
        <Input
          className="font-mono text-[12.5px]"
          value={chatExportFolder}
          onChange={(e) => setChatExportFolder(e.target.value)}
          placeholder={DEFAULT_CHAT_EXPORT_FOLDER}
        />
        <p className="text-xs text-muted-foreground">
          Folder path for chat exports. Use placeholders <code className="rounded bg-muted px-1">{"{YYYY}"}</code> (year),{" "}
          <code className="rounded bg-muted px-1">{"{MM}"}</code> (month),{" "}
          <code className="rounded bg-muted px-1">{"{DD}"}</code> (day).
        </p>
      </FieldRow>

      <Button type="submit" disabled={isSaving} className="mt-1 w-fit">
        {isSaving ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  );
}
