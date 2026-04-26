import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <PageHeader
      icon={Info}
      label="About"
      title="About"
      highlight="Aether"
      description="A self-hosted personal dashboard and AI agent platform, backed by your Obsidian vault."
    >
      <div className="surface-card max-w-3xl p-6 sm:p-8">
        <p className="m-0 text-sm leading-7 text-muted-foreground">
          Aether stitches together AI chat, markdown-defined workflows, cron-scheduled tasks, event-driven triggers, and a
          plugin system into one keyboard-first surface. Notes, tasks, and configuration live in Obsidian — Aether is the
          runtime that watches, reacts, and reports back.
        </p>
      </div>
    </PageHeader>
  );
}
