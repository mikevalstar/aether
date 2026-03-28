import { createFileRoute, redirect } from "@tanstack/react-router";
import { Bot, BrainCircuit, Check, CircuitBoard, Cpu, Puzzle, Settings2, Sparkles, Star, Wrench, X } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { getSession } from "#/lib/auth.functions";
import { type ChatDebugData, getChatDebugData } from "#/lib/chat-debug.functions";

export const Route = createFileRoute("/chat-debug")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    return await getChatDebugData();
  },
  component: ChatDebugPage,
});

function BoolBadge({ value, label }: { value: boolean; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={
        value
          ? "gap-1.5 border-[var(--teal)]/30 bg-[var(--teal)]/10 text-[var(--teal)]"
          : "gap-1.5 border-border bg-muted/60 text-muted-foreground"
      }
    >
      {value ? <Check className="size-3" /> : <X className="size-3" />}
      {label}
    </Badge>
  );
}

function ChatDebugPage() {
  const data = Route.useLoaderData() as ChatDebugData;

  const toolCategories = [...new Set(data.tools.map((t) => t.category))];

  return (
    <main className="relative overflow-hidden">
      <GlowBg color="var(--teal)" size="size-[520px]" position="-right-48 -top-48" />
      <GlowBg color="var(--coral)" size="size-[320px]" position="-left-32 top-80" />

      <div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
        {/* Header */}
        <section className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel icon={CircuitBoard} color="text-[var(--teal)]">
              System
            </SectionLabel>
            <h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Chat <span className="text-[var(--teal)]">debug</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Models, tools, skills, plugins, and configuration for the AI chat system.
            </p>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-6">
          <SectionHeading icon={Settings2} label="Configuration" />
          <div className="surface-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <ConfigItem label="Anthropic API Key" value={data.config.hasAnthropicKey} />
            <ConfigItem label="OpenRouter API Key" value={data.config.hasOpenRouterKey} />
            <ConfigItem label="Exa API Key" value={data.config.hasExaKey} />
            <ConfigItem label="Obsidian Vault" value={data.config.hasObsidianDir} detail={data.config.obsidianDir} />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Max tool steps</span>
              <span className="text-sm font-medium text-foreground">{data.config.maxToolSteps}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Default effort</span>
              <span className="text-sm font-medium text-foreground">
                {data.defaultEffort} ({data.effortLevels.join(" / ")})
              </span>
            </div>
          </div>
        </section>

        {/* Models */}
        <section className="mb-6">
          <SectionHeading icon={Cpu} label={`Models (${data.models.length})`} />
          <div className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Input $/M</TableHead>
                  <TableHead className="text-right">Output $/M</TableHead>
                  <TableHead>Web Tools</TableHead>
                  <TableHead>Effort</TableHead>
                  <TableHead>Code Exec</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{m.label}</span>
                        {m.isDefault && (
                          <Badge
                            variant="outline"
                            className="border-muted-foreground/30 bg-muted/40 text-muted-foreground text-[10px]"
                          >
                            system default
                          </Badge>
                        )}
                        {m.id === data.userDefaultModel && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-[var(--coral)]/30 bg-[var(--coral)]/10 text-[var(--coral)] text-[10px]"
                          >
                            <Star className="size-2.5" />
                            your default
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.description}</div>
                      <code className="text-[11px] text-muted-foreground/70">{m.id}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {m.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span className="text-[var(--teal)]">${m.pricing.inputCostPerMillionTokensUsd}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span className="text-[var(--coral)]">${m.pricing.outputCostPerMillionTokensUsd}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {m.webToolVersion}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <BoolBadge value={m.supportsEffort} />
                    </TableCell>
                    <TableCell>
                      <BoolBadge value={m.supportsCodeExecution} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Tools by category */}
        <section className="mb-6">
          <SectionHeading icon={Wrench} label={`Tools (${data.tools.length})`} />
          <div className="space-y-4">
            {toolCategories.map((category) => {
              const tools = data.tools.filter((t) => t.category === category);
              return (
                <div key={category} className="surface-card overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <CategoryIcon category={category} />
                    <span className="text-sm font-semibold text-foreground">{category}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {tools.length}
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Tool</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[320px]">Parameters</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tools.map((tool) => (
                        <TableRow key={tool.name}>
                          <TableCell className="align-top">
                            <code className="text-sm font-medium text-[var(--teal)]">{tool.name}</code>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {tool.conditional && (
                                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                  {tool.conditional}
                                </Badge>
                              )}
                              {tool.isProviderTool && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal border-[var(--coral)]/30 bg-[var(--coral)]/10 text-[var(--coral)]"
                                >
                                  provider-managed
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            {truncateDescription(tool.description)}
                          </TableCell>
                          <TableCell className="align-top">
                            {tool.isProviderTool ? (
                              <span className="text-xs text-muted-foreground/50">Managed by provider</span>
                            ) : tool.parameters.length > 0 ? (
                              <div className="space-y-1.5">
                                {tool.parameters.map((p) => (
                                  <div key={p.name} className="flex items-start gap-1.5 text-xs">
                                    <code className="shrink-0 font-medium text-foreground">
                                      {p.name}
                                      {p.required && <span className="text-[var(--coral)]">*</span>}
                                    </code>
                                    <span className="text-muted-foreground/70">({p.type})</span>
                                    {p.description && <span className="text-muted-foreground">{p.description}</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">No parameters</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </section>

        {/* Skills */}
        <section className="mb-6">
          <SectionHeading icon={Sparkles} label={`Skills (${data.skills.length})`} />
          {data.skills.length > 0 ? (
            <div className="surface-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Filename</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Priority</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.skills.map((skill) => (
                    <TableRow key={skill.filename}>
                      <TableCell>
                        <code className="text-xs text-[var(--teal)]">{skill.filename}</code>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{skill.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{skill.description}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{skill.priority ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(skill.tags ?? []).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="surface-card px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No skills configured. Add skill files to the AI config skills directory.
              </p>
            </div>
          )}
        </section>

        {/* Plugins */}
        <section className="mb-6">
          <SectionHeading icon={Puzzle} label={`Plugins (${data.plugins.length})`} />
          <div className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plugin</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Version</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.plugins.map((plugin) => (
                  <TableRow key={plugin.id}>
                    <TableCell className="font-medium text-foreground">{plugin.name}</TableCell>
                    <TableCell>
                      <code className="text-xs text-[var(--teal)]">{plugin.id}</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{plugin.description}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{plugin.version}</TableCell>
                    <TableCell>
                      <BoolBadge value={plugin.enabled} label={plugin.enabled ? "Enabled" : "Disabled"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Plugin tools are namespaced as <code className="text-[var(--teal)]">{"{plugin_id}_{tool_name}"}</code> and only
            available when the plugin is enabled in user preferences.
          </p>
        </section>
      </div>
    </main>
  );
}

/** Truncate long tool descriptions to first sentence or ~120 chars. */
function truncateDescription(desc: string): string {
  if (!desc) return "";
  // Take first sentence
  const firstSentence = desc.split(/\.\s/)[0];
  if (firstSentence && firstSentence.length < desc.length) {
    return `${firstSentence}.`;
  }
  if (desc.length > 150) {
    return `${desc.slice(0, 147)}...`;
  }
  return desc;
}

function SectionHeading({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="size-4 text-[var(--teal)]" />
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">{label}</h2>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "Web":
    case "Web (Exa)":
      return <Bot className="size-4 text-[var(--teal)]" />;
    case "Obsidian":
    case "Memory":
      return <BrainCircuit className="size-4 text-[var(--teal)]" />;
    case "Code":
      return <Cpu className="size-4 text-[var(--teal)]" />;
    case "Skills":
      return <Sparkles className="size-4 text-[var(--teal)]" />;
    default:
      return <Wrench className="size-4 text-[var(--teal)]" />;
  }
}

function ConfigItem({ label, value, detail }: { label: string; value: boolean; detail?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <BoolBadge value={value} label={value ? "Configured" : "Not set"} />
        {detail && value && <span className="truncate text-xs text-muted-foreground/70">{detail}</span>}
      </div>
    </div>
  );
}
