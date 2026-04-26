import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Bot,
  BrainCircuit,
  Check,
  CircuitBoard,
  Cpu,
  Puzzle,
  Settings2,
  Sparkles,
  Star,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { Badge } from "#/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { getSession } from "#/lib/auth.functions";
import { type ChatDebugData, getChatDebugData } from "#/lib/chat/chat-debug.functions";

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
          ? "gap-1.5 border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
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
    <PageHeader
      icon={CircuitBoard}
      label="System"
      title="Chat"
      highlight="debug"
      description="Models, tools, skills, sub-agents, plugins, and configuration for the AI chat system."
      glows={false}
    >
      {/* Configuration */}
      <Section icon={Settings2} label="Configuration">
        <div className="surface-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <ConfigItem label="Anthropic API key" value={data.config.hasAnthropicKey} />
          <ConfigItem label="OpenRouter API key" value={data.config.hasOpenRouterKey} />
          <ConfigItem label="Exa API key" value={data.config.hasExaKey} />
          <ConfigItem label="Obsidian vault" value={data.config.hasObsidianDir} detail={data.config.obsidianDir} />
          <KeyValue label="Max tool steps" value={data.config.maxToolSteps} />
          <KeyValue label="Default effort" value={`${data.defaultEffort} (${data.effortLevels.join(" / ")})`} />
        </div>
      </Section>

      {/* Models */}
      <Section icon={Cpu} label={`Models · ${data.models.length}`}>
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Input $/M</TableHead>
                <TableHead className="text-right">Output $/M</TableHead>
                <TableHead>Web tools</TableHead>
                <TableHead>Effort</TableHead>
                <TableHead>Code exec</TableHead>
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
                          className="border-muted-foreground/30 bg-muted/40 text-[10px] text-muted-foreground"
                        >
                          system default
                        </Badge>
                      )}
                      {m.id === data.userDefaultModel && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[10px] text-[var(--accent)]"
                        >
                          <Star className="size-2.5" />
                          your default
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-[var(--ink-soft)]">{m.description}</div>
                    <code className="font-mono text-[11px] text-[var(--ink-faint)]">{m.id}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {m.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    <span className="text-[var(--accent)]">${m.pricing.inputCostPerMillionTokensUsd}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    <span className="text-[var(--destructive)]">${m.pricing.outputCostPerMillionTokensUsd}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
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
      </Section>

      {/* Tools by category */}
      <Section icon={Wrench} label={`Tools · ${data.tools.length}`}>
        <div className="space-y-3">
          {toolCategories.map((category) => {
            const tools = data.tools.filter((t) => t.category === category);
            return (
              <div key={category} className="surface-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                  <CategoryIcon category={category} />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                    {category}
                  </span>
                  <Badge variant="outline" className="ml-auto font-mono text-[10px]">
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
                          <code className="font-mono text-sm font-medium text-[var(--accent)]">{tool.name}</code>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {tool.conditional && (
                              <Badge variant="outline" className="font-normal text-[10px] text-[var(--ink-soft)]">
                                {tool.conditional}
                              </Badge>
                            )}
                            {tool.isProviderTool && (
                              <Badge
                                variant="outline"
                                className="border-[var(--destructive)]/30 bg-[var(--destructive)]/10 font-normal text-[10px] text-[var(--destructive)]"
                              >
                                provider-managed
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-[var(--ink-soft)]">
                          {truncateDescription(tool.description)}
                        </TableCell>
                        <TableCell className="align-top">
                          {tool.isProviderTool ? (
                            <span className="text-xs text-[var(--ink-faint)]">Managed by provider</span>
                          ) : tool.parameters.length > 0 ? (
                            <div className="space-y-1.5">
                              {tool.parameters.map((p) => (
                                <div key={p.name} className="flex items-start gap-1.5 text-xs">
                                  <code className="shrink-0 font-mono font-medium text-foreground">
                                    {p.name}
                                    {p.required && <span className="text-[var(--destructive)]">*</span>}
                                  </code>
                                  <span className="text-[var(--ink-faint)]">({p.type})</span>
                                  {p.description && <span className="text-[var(--ink-soft)]">{p.description}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--ink-faint)]">No parameters</span>
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
      </Section>

      {/* Skills */}
      <Section icon={Sparkles} label={`Skills · ${data.skills.length}`}>
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
                      <code className="font-mono text-xs text-[var(--accent)]">{skill.filename}</code>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{skill.name}</TableCell>
                    <TableCell className="text-sm text-[var(--ink-soft)]">{skill.description}</TableCell>
                    <TableCell className="text-center font-mono text-sm tabular-nums">{skill.priority ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(skill.tags ?? []).map((tag) => (
                          <Badge key={tag} variant="outline" className="font-mono text-[10px]">
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
          <EmptySectionCard text="No skills configured. Add skill files to the AI config skills directory." />
        )}
      </Section>

      {/* Sub-agents */}
      <Section icon={Users} label={`Sub-agents · ${data.subAgents.length}`}>
        {data.subAgents.length > 0 ? (
          <div className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Filename</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[180px]">Model override</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.subAgents.map((subAgent) => (
                  <TableRow key={subAgent.filename}>
                    <TableCell>
                      <code className="font-mono text-xs text-[var(--accent)]">{subAgent.filename}</code>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{subAgent.name}</TableCell>
                    <TableCell className="text-sm text-[var(--ink-soft)]">{subAgent.description}</TableCell>
                    <TableCell className="text-sm text-[var(--ink-soft)]">
                      {subAgent.model ? <code className="font-mono text-xs">{subAgent.model}</code> : "inherit"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptySectionCard text="No sub-agents configured. Add sub-agent files to the AI config sub-agents/ directory." />
        )}
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Sub-agents are spawned in parallel via the <code className="font-mono text-[var(--accent)]">spawn_sub_agents</code>{" "}
          tool. Each inherits the parent's tools (minus <code className="font-mono">spawn_sub_agents</code>) and effort; the
          model is inherited unless overridden in frontmatter.
        </p>
      </Section>

      {/* Plugins */}
      <Section icon={Puzzle} label={`Plugins · ${data.plugins.length}`}>
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
                    <code className="font-mono text-xs text-[var(--accent)]">{plugin.id}</code>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--ink-soft)]">{plugin.description}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--ink-soft)]">{plugin.version}</TableCell>
                  <TableCell>
                    <BoolBadge value={plugin.enabled} label={plugin.enabled ? "Enabled" : "Disabled"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Plugin tools are namespaced as <code className="font-mono text-[var(--accent)]">{"{plugin_id}_{tool_name}"}</code>{" "}
          and only available when the plugin is enabled in user preferences.
        </p>
      </Section>
    </PageHeader>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="size-3.5 text-[var(--accent)]" />
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "Web":
    case "Web (Exa)":
      return <Bot className="size-4 text-[var(--accent)]" />;
    case "Obsidian":
    case "Memory":
      return <BrainCircuit className="size-4 text-[var(--accent)]" />;
    case "Code":
      return <Cpu className="size-4 text-[var(--accent)]" />;
    case "Skills":
      return <Sparkles className="size-4 text-[var(--accent)]" />;
    case "Sub-agents":
      return <Users className="size-4 text-[var(--accent)]" />;
    default:
      return <Wrench className="size-4 text-[var(--accent)]" />;
  }
}

function ConfigItem({ label, value, detail }: { label: string; value: boolean; detail?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <BoolBadge value={value} label={value ? "Configured" : "Not set"} />
        {detail && value && <span className="truncate font-mono text-xs text-[var(--ink-soft)]">{detail}</span>}
      </div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {label}
      </span>
      <span className="font-mono text-sm text-foreground">{value}</span>
    </div>
  );
}

function EmptySectionCard({ text }: { text: string }) {
  return (
    <div className="surface-card px-6 py-10 text-center">
      <p className="text-sm text-[var(--ink-soft)]">{text}</p>
    </div>
  );
}

/** Truncate long tool descriptions to first sentence or ~150 chars. */
function truncateDescription(desc: string): string {
  if (!desc) return "";
  const firstSentence = desc.split(/\.\s/)[0];
  if (firstSentence && firstSentence.length < desc.length) {
    return `${firstSentence}.`;
  }
  if (desc.length > 150) {
    return `${desc.slice(0, 147)}...`;
  }
  return desc;
}
