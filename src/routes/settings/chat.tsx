import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { CHAT_MODELS, type ChatModel, DEFAULT_CHAT_MODEL } from "#/lib/chat/chat-models";
import { updateUserPreferences } from "#/lib/preferences.functions";

const settingsRoute = getRouteApi("/settings");

export const Route = createFileRoute("/settings/chat")({
  component: ChatSection,
});

function ChatSection() {
  const data = settingsRoute.useLoaderData();

  const [defaultChatModel, setDefaultChatModel] = useState<ChatModel>(
    data.preferences.defaultChatModel || DEFAULT_CHAT_MODEL,
  );
  const [isSaving, setIsSaving] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
          await updateUserPreferences({ data: { defaultChatModel } });
          toast.success("Chat settings saved");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save chat settings");
        } finally {
          setIsSaving(false);
        }
      }}
      className="surface-card p-6"
    >
      <h2 className="mb-4 text-lg font-semibold">Chat</h2>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pref-default-model">Default model</Label>
          <Select value={defaultChatModel} onValueChange={(v) => setDefaultChatModel(v as ChatModel)}>
            <SelectTrigger id="pref-default-model" className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {CHAT_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.label} — {model.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">The model used by default when starting a new chat thread.</p>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save chat settings"}
        </Button>
      </div>
    </form>
  );
}
