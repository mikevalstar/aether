import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { tool } from "ai";
import { z } from "zod";
import { logFileChange } from "#/lib/activity";
import { logger } from "#/lib/logger";
import { OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";
import { resolveNotePath } from "#/lib/obsidian/vault-index";
import type { ObsidianToolContext } from "./obsidian-context";

const execFileAsync = promisify(execFile);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRelative(input: string): string | { error: string } {
  const normalized = input.replace(/\\/g, "/").trim();
  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
    return { error: "Invalid file path." };
  }
  return normalized;
}

export function createObsidianMove(ctx: ObsidianToolContext) {
  return tool({
    description:
      "Move (rename) a note in the user's Obsidian vault from one path to another. Creates intermediate folders as needed. Fails if the destination already exists. When the filename itself changes (not just the folder), bare wiki-links (`[[old name]]`, `[[old name|alias]]`, `[[old name#heading]]`) and markdown links to `oldname.md` across the vault are rewritten to point at the new name. Path-prefixed wiki-links (e.g. `[[folder/old name]]`) are left alone — those are explicit references and the AI shouldn't second-guess them.",
    inputSchema: z.object({
      fromPath: z.string().describe("The current relative path of the note within the vault, e.g. 'folder/note.md'."),
      toPath: z
        .string()
        .describe(
          "The new relative path within the vault, e.g. 'new-folder/note.md'. Must end in .md. Intermediate folders are created automatically.",
        ),
    }),
    execute: async ({ fromPath, toPath }) => {
      const obsidianRoot = OBSIDIAN_DIR;
      if (!obsidianRoot) {
        return { error: "Obsidian vault is not configured." };
      }

      const fromNorm = normalizeRelative(fromPath);
      if (typeof fromNorm !== "string") return fromNorm;
      const toNormRaw = normalizeRelative(toPath);
      if (typeof toNormRaw !== "string") return toNormRaw;

      // Resolve from path against the vault index (handles partial paths)
      const resolvedFrom = (await resolveNotePath(fromNorm)) ?? fromNorm;

      let toNorm = toNormRaw;
      if (!toNorm.toLowerCase().endsWith(".md")) {
        toNorm = `${toNorm}.md`;
      }

      if (resolvedFrom === toNorm) {
        return { error: "Source and destination paths are the same." };
      }

      const resolvedRoot = path.resolve(obsidianRoot);
      const fromAbs = path.resolve(path.join(obsidianRoot, resolvedFrom));
      const toAbs = path.resolve(path.join(obsidianRoot, toNorm));

      if (!fromAbs.startsWith(resolvedRoot) || !toAbs.startsWith(resolvedRoot)) {
        return { error: "Path traversal detected." };
      }

      try {
        await fs.stat(fromAbs);
      } catch {
        return { error: `Source file not found: ${resolvedFrom}` };
      }

      try {
        await fs.stat(toAbs);
        return { error: `Destination already exists: ${toNorm}` };
      } catch {
        // Good — destination doesn't exist
      }

      const fileContent = await fs.readFile(fromAbs, "utf8");

      try {
        await fs.mkdir(path.dirname(toAbs), { recursive: true });
        await fs.rename(fromAbs, toAbs);
      } catch (err) {
        return {
          error: `Could not move file: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      // Carry over any read-cache entry to the new path
      const readMtime = ctx.readFiles.get(resolvedFrom);
      if (readMtime) {
        ctx.readFiles.delete(resolvedFrom);
        ctx.readFiles.set(toNorm, readMtime);
      }

      const fromBase = path.basename(resolvedFrom, ".md");
      const toBase = path.basename(toNorm, ".md");
      const filenameChanged = fromBase !== toBase;

      // Log the move itself
      try {
        await logFileChange({
          userId: ctx.userId,
          filePath: toNorm,
          originalContent: fileContent,
          newContent: fileContent,
          changeSource: "ai",
          toolName: "obsidian_move",
          summary: `AI moved ${resolvedFrom} → ${toNorm}`,
          metadata: {
            fromPath: resolvedFrom,
            toPath: toNorm,
            ...(ctx.chatThreadId ? { chatThreadId: ctx.chatThreadId } : {}),
          },
        });
      } catch (err) {
        logger.error({ err }, "Activity log failed");
      }

      const updatedReferenceFiles: string[] = [];

      if (filenameChanged) {
        const escapedBase = escapeRegex(fromBase);
        // Bare wiki-links only — no path prefix. [[oldBase]], [[oldBase|alias]], [[oldBase#heading]].
        const wikiRe = new RegExp(`\\[\\[${escapedBase}(?=[\\]|#])`, "g");
        // Markdown / inline references to the old filename with extension.
        // Require the preceding char to not be a path/word char so we don't
        // match a longer filename that happens to end in oldBase.md.
        const mdRe = new RegExp(`(^|[^A-Za-z0-9_\\-/])${escapedBase}\\.md\\b`, "g");

        // Use ripgrep to narrow to candidate files. Patterns are a superset of
        // the JS regexes (rg's Rust regex doesn't support lookaround), so we
        // re-verify with the precise regex below.
        const rgWiki = `\\[\\[${escapedBase}[\\]|#]`;
        const rgMd = `${escapedBase}\\.md`;

        let candidates: string[] = [];
        try {
          const { stdout } = await execFileAsync(
            "rg",
            ["--null", "--files-with-matches", "--glob", "*.md", "-e", rgWiki, "-e", rgMd, resolvedRoot],
            { maxBuffer: 32 * 1024 * 1024 },
          );
          candidates = stdout.split("\0").filter(Boolean);
        } catch (err) {
          // rg exits 1 when there are no matches — that's not an error for us.
          const e = err as { code?: number; stdout?: string };
          if (e.code === 1) {
            candidates = [];
          } else {
            logger.error({ err }, "ripgrep failed during obsidian_move link rewrite");
            candidates = [];
          }
        }

        for (const noteAbs of candidates) {
          const resolvedNoteAbs = path.resolve(noteAbs);
          if (!resolvedNoteAbs.startsWith(resolvedRoot)) continue;
          if (resolvedNoteAbs === toAbs) continue; // skip the moved file itself

          const relativePath = path.relative(resolvedRoot, resolvedNoteAbs).split(path.sep).join("/");

          let original: string;
          try {
            original = await fs.readFile(resolvedNoteAbs, "utf8");
          } catch {
            continue;
          }

          const updated = original.replace(wikiRe, `[[${toBase}`).replace(mdRe, `$1${toBase}.md`);

          if (updated === original) continue;

          try {
            await fs.writeFile(resolvedNoteAbs, updated, "utf8");
            updatedReferenceFiles.push(relativePath);
            await logFileChange({
              userId: ctx.userId,
              filePath: relativePath,
              originalContent: original,
              newContent: updated,
              changeSource: "ai",
              toolName: "obsidian_move",
              summary: `AI updated links in ${path.basename(relativePath)} (${fromBase} → ${toBase})`,
              metadata: {
                fromPath: resolvedFrom,
                toPath: toNorm,
                ...(ctx.chatThreadId ? { chatThreadId: ctx.chatThreadId } : {}),
              },
            });
          } catch (err) {
            logger.error({ err, file: relativePath }, "Failed to update reference in note");
          }
        }
      }

      return {
        fromPath: resolvedFrom,
        toPath: toNorm,
        success: true,
        filenameChanged,
        referencesUpdated: updatedReferenceFiles.length,
        updatedReferenceFiles,
        message: filenameChanged
          ? `File moved. Updated references in ${updatedReferenceFiles.length} other note(s).`
          : "File moved. Filename unchanged, so no references were rewritten.",
      };
    },
  });
}
