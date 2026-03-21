import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { updateUserPreferences } from "#/lib/preferences.functions";

const NO_TEMPLATES_FOLDER = "__bundled__";
const settingsRoute = getRouteApi("/settings");

export const Route = createFileRoute("/settings/obsidian")({
  component: ObsidianSection,
});

function ObsidianSection() {
  const data = settingsRoute.useLoaderData();

  const [templatesFolder, setTemplatesFolder] = useState(data.preferences.obsidianTemplatesFolder || NO_TEMPLATES_FOLDER);
  const [isSaving, setIsSaving] = useState(false);

  if (data.obsidianFolders.length === 0) {
    return (
      <div className="surface-card p-6">
        <h2 className="mb-2 text-lg font-semibold">Obsidian</h2>
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
            },
          });
          toast.success("Preferences saved");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save preferences");
        } finally {
          setIsSaving(false);
        }
      }}
      className="surface-card p-6"
    >
      <h2 className="mb-4 text-lg font-semibold">Obsidian</h2>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Templates folder</Label>
          <Select value={templatesFolder} onValueChange={setTemplatesFolder}>
            <SelectTrigger className="w-full">
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
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
