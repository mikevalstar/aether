import { promises as fs } from "node:fs";
import path from "node:path";
import { parseAndValidateAiConfig } from "#/lib/ai-config/ai-config.shared";
import type { ChatModel } from "#/lib/chat/chat-models";
import { resolveModelId } from "#/lib/chat/chat-models";
import { logger } from "#/lib/logger";
import { OBSIDIAN_AI_CONFIG, OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";

export type SubAgentSummary = {
  name: string;
  description: string;
  filename: string;
  model?: ChatModel;
};

export type SubAgentEntry = SubAgentSummary & {
  body: string;
};

function getSubAgentsDir(): string {
  const obsidianDir = OBSIDIAN_DIR;
  const aiConfigRel = OBSIDIAN_AI_CONFIG;
  if (!obsidianDir || !aiConfigRel) return "";
  return path.join(obsidianDir, aiConfigRel, "sub-agents");
}

/**
 * Read all valid sub-agent files from the sub-agents/ directory.
 * Invalid files are logged as warnings and excluded.
 */
export async function readAllSubAgents(): Promise<SubAgentEntry[]> {
  const dir = getSubAgentsDir();
  if (!dir) return [];

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const subAgents: SubAgentEntry[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;

    const filePath = path.join(dir, entry);
    let rawContent: string;
    try {
      rawContent = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const configFilename = `sub-agents/${entry}`;
    const result = parseAndValidateAiConfig(configFilename, rawContent);

    if (!result.validation.isValid) {
      logger.warn({ filename: entry, errors: result.validation.errors }, "Invalid sub-agent file, skipping");
      continue;
    }

    const { name, description, model } = result.frontmatter as {
      name: string;
      description: string;
      model?: string;
    };

    const resolvedModel = model ? (resolveModelId(model) as ChatModel | undefined) : undefined;

    subAgents.push({
      name,
      description,
      filename: entry,
      ...(resolvedModel ? { model: resolvedModel } : {}),
      body: result.body,
    });
  }

  subAgents.sort((a, b) => a.name.localeCompare(b.name));

  return subAgents;
}

/**
 * Find a sub-agent by filename (exact) or by name (case-insensitive fallback).
 */
export function findSubAgent(subAgents: SubAgentEntry[], agentRef: string): SubAgentEntry | undefined {
  const direct = subAgents.find((s) => s.filename === agentRef);
  if (direct) return direct;
  const withExt = subAgents.find((s) => s.filename === `${agentRef}.md`);
  if (withExt) return withExt;
  const byName = subAgents.find((s) => s.name.toLowerCase() === agentRef.toLowerCase());
  if (byName) return byName;
  return undefined;
}
