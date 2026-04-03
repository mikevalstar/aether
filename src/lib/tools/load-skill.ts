import { tool } from "ai";
import { z } from "zod";
import type { SkillEntry } from "#/lib/skills";

/**
 * Create a load_skill tool with a closure over the loaded skills list.
 */
export function createLoadSkill(skills: SkillEntry[]) {
  return tool({
    description:
      "Load a skill's full instructions before performing a specialized task. Call this when the user's request matches one of the available skill descriptions listed in the system prompt. Always load the skill BEFORE starting the task — do not attempt the task from memory alone.",
    inputSchema: z.object({
      filename: z.string().describe("The skill filename to load (e.g. write-workflow.md)"),
    }),
    execute: async ({ filename }) => {
      const skill = skills.find((s) => s.filename === filename);
      if (!skill) {
        return { error: `Skill "${filename}" not found. Available skills: ${skills.map((s) => s.filename).join(", ")}` };
      }
      return { name: skill.name, instructions: skill.body };
    },
  });
}
