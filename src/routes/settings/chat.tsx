import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { OpenRouterModelPicker } from "#/components/chat/OpenRouterModelPicker";
import { Button } from "#/components/ui/button";
import { FieldRow } from "#/components/ui/field-row";
import { SectionLabel } from "#/components/ui/section-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { type ChatModel, DEFAULT_CHAT_MODEL } from "#/lib/chat/chat-models";
import { type ChatModelOption, listChatModels } from "#/lib/chat/chat-models.functions";
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
  const [models, setModels] = useState<ChatModelOption[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listChatModels()
      .then((list) => {
        if (!cancelled) setModels(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-5">
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
        className="surface-card flex flex-col gap-5 p-6"
      >
        <header className="flex flex-col gap-1.5">
          <SectionLabel icon={MessageSquare}>Chat</SectionLabel>
          <p className="text-sm text-muted-foreground">Default model used when starting a new chat thread.</p>
        </header>

        <FieldRow label="DEFAULT MODEL" htmlFor="pref-default-model" hint={<span>per-thread override available</span>}>
          <Select value={defaultChatModel} onValueChange={(v) => setDefaultChatModel(v as ChatModel)}>
            <SelectTrigger id="pref-default-model" className="w-full font-mono text-[12.5px]">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {(models ?? []).map((model) => (
                <SelectItem key={`${model.provider}:${model.id}`} value={model.id}>
                  {model.label} — {model.description || model.provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <Button type="submit" disabled={isSaving} className="mt-1 w-fit">
          {isSaving ? "Saving..." : "Save chat settings"}
        </Button>
      </form>

      <section className="surface-card flex flex-col gap-4 p-6">
        <header className="flex flex-col gap-1.5">
          <SectionLabel icon={Sparkles}>OpenRouter models</SectionLabel>
          <p className="text-sm text-muted-foreground">
            Pick which OpenRouter models appear in the chat model selector. Removing a model later will not break historical
            chats — they keep their original label and provider.
          </p>
        </header>
        <OpenRouterModelPicker />
      </section>
    </div>
  );
}
