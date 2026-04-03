import { promises as fs } from "node:fs";
import path from "node:path";
import { parseAndValidateAiConfig } from "#/lib/ai-config/ai-config.shared";
import { logger } from "#/lib/logger";

export type SkillSummary = {
  name: string;
  description: string;
  filename: string;
  tags?: string[];
  priority?: number;
};

export type SkillEntry = SkillSummary & {
  body: string;
};

function getSkillsDir(): string {
  const obsidianDir = process.env.OBSIDIAN_DIR ?? "";
  const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG ?? "";
  if (!obsidianDir || !aiConfigRel) return "";
  return path.join(obsidianDir, aiConfigRel, "skills");
}

/**
 * Read all valid skill files from the skills/ directory.
 * Invalid skills are logged as warnings and excluded.
 */
export async function readAllSkills(): Promise<SkillEntry[]> {
  const skillsDir = getSkillsDir();
  if (!skillsDir) return [];

  let entries: string[];
  try {
    entries = await fs.readdir(skillsDir);
  } catch {
    return [];
  }

  const skills: SkillEntry[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;

    const filePath = path.join(skillsDir, entry);
    let rawContent: string;
    try {
      rawContent = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const configFilename = `skills/${entry}`;
    const result = parseAndValidateAiConfig(configFilename, rawContent);

    if (!result.validation.isValid) {
      logger.warn({ filename: entry, errors: result.validation.errors }, "Invalid skill file, skipping");
      continue;
    }

    const { name, description, tags, priority } = result.frontmatter as {
      name: string;
      description: string;
      tags?: string[];
      priority?: number;
    };

    skills.push({
      name,
      description,
      filename: entry,
      tags,
      priority,
      body: result.body,
    });
  }

  // Sort by priority descending (higher = first), then alphabetically by name
  skills.sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pb !== pa) return pb - pa;
    return a.name.localeCompare(b.name);
  });

  return skills;
}

/**
 * Build the system prompt section for skills.
 * Returns empty string if no skills are available.
 */
export function buildSkillsPromptSection(skills: SkillEntry[]): string {
  if (skills.length === 0) return "";

  const lines = skills.map((s) => `- ${s.filename}: ${s.description}`);

  return [
    "",
    "",
    "<skills>",
    "You have access to specialized skills that provide detailed instructions for specific tasks. When a user's request matches a skill description below, call the `load_skill` tool to load its full instructions BEFORE attempting the task. Do not guess at a skill's process — always load it first.",
    "",
    "Available skills:",
    ...lines,
    "</skills>",
  ].join("\n");
}
