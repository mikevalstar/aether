import { tool } from "ai";
import { z } from "zod";
import { logger } from "#/lib/logger";
import type { AetherPluginServer } from "../types";
import { archiveEmail, getUnreadCount, type ImapOptions, listFolders, listInbox, moveEmail, readEmail, searchEmails } from "./lib/imap-client";

export const imapServer: AetherPluginServer = {
  systemPrompt: `You have access to email tools via IMAP. Use these tools when the user asks about their email:
- imap_email_list_inbox: List recent emails from the inbox (returns subject, from, date, unread status, UID)
- imap_email_read_email: Read the full content of a specific email by UID
- imap_email_search_emails: Search emails by subject, sender, or body content
- imap_email_list_folders: List all mailbox folders with message counts
- imap_email_move_email: Move an email to a different folder by UID
- imap_email_archive_email: Archive an email (auto-detects the Archive folder)
Always use list_inbox or search_emails first to get UIDs before reading, moving, or archiving.`,

  createTools(ctx) {
    async function getImapOptions(): Promise<ImapOptions> {
      const opts = await ctx.getOptions<Partial<ImapOptions>>();
      if (!opts.username || !opts.password) {
        throw new Error(
          "IMAP email plugin is not configured. Please set up credentials in Settings > Plugins > Email (IMAP).",
        );
      }
      return {
        host: opts.host ?? "127.0.0.1",
        port: opts.port ?? 1143,
        username: opts.username,
        password: opts.password,
        tls: opts.tls ?? false,
      };
    }

    return {
      list_inbox: tool({
        description:
          "List recent emails from the user's inbox. Returns subject, sender, date, and unread status for each email.",
        inputSchema: z.object({
          limit: z.number().min(1).max(50).optional().describe("Number of recent emails to fetch (default 20)"),
        }),
        execute: async ({ limit }) => {
          logger.info({ limit, userId: ctx.userId }, "IMAP tool: list_inbox invoked");
          try {
            const options = await getImapOptions();
            const emails = await listInbox(options, limit ?? 20);
            await ctx.logActivity({
              type: "email_check",
              summary: `Checked inbox — ${emails.length} emails listed`,
              metadata: { emailCount: emails.length, unreadCount: emails.filter((e) => e.unread).length },
            });
            logger.info({ count: emails.length, userId: ctx.userId }, "IMAP tool: list_inbox complete");
            return { emails, count: emails.length };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "IMAP tool: list_inbox failed");
            return { error: err instanceof Error ? err.message : "Failed to list inbox" };
          }
        },
      }),

      read_email: tool({
        description: "Read the full content of a specific email by its UID. Use list_inbox first to get UIDs.",
        inputSchema: z.object({
          uid: z.number().describe("The UID of the email to read"),
        }),
        execute: async ({ uid }) => {
          logger.info({ uid, userId: ctx.userId }, "IMAP tool: read_email invoked");
          try {
            const options = await getImapOptions();
            const email = await readEmail(options, uid);
            logger.info({ uid, subject: email.subject, userId: ctx.userId }, "IMAP tool: read_email complete");
            return {
              subject: email.subject,
              from: email.from,
              to: email.to,
              date: email.date,
              body: email.textBody,
            };
          } catch (err) {
            logger.error({ err, uid, userId: ctx.userId }, "IMAP tool: read_email failed");
            return { error: err instanceof Error ? err.message : "Failed to read email" };
          }
        },
      }),

      search_emails: tool({
        description: "Search emails by subject, sender, or body content. Returns matching emails with basic envelope info.",
        inputSchema: z.object({
          query: z.string().describe("Search query — matches subject, sender, and body"),
          limit: z.number().min(1).max(50).optional().describe("Max results (default 20)"),
        }),
        execute: async ({ query, limit }) => {
          logger.info({ query, limit, userId: ctx.userId }, "IMAP tool: search_emails invoked");
          try {
            const options = await getImapOptions();
            const emails = await searchEmails(options, query, limit ?? 20);
            logger.info({ query, count: emails.length, userId: ctx.userId }, "IMAP tool: search_emails complete");
            return { emails, count: emails.length, query };
          } catch (err) {
            logger.error({ err, query, userId: ctx.userId }, "IMAP tool: search_emails failed");
            return { error: err instanceof Error ? err.message : "Failed to search emails" };
          }
        },
      }),

      list_folders: tool({
        description: "List all mailbox folders with their message counts. Use this to discover available folders before moving emails.",
        inputSchema: z.object({}),
        execute: async () => {
          logger.info({ userId: ctx.userId }, "IMAP tool: list_folders invoked");
          try {
            const options = await getImapOptions();
            const folders = await listFolders(options);
            logger.info({ count: folders.length, userId: ctx.userId }, "IMAP tool: list_folders complete");
            return { folders, count: folders.length };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "IMAP tool: list_folders failed");
            return { error: err instanceof Error ? err.message : "Failed to list folders" };
          }
        },
      }),

      move_email: tool({
        description: "Move an email to a different folder. Use list_folders first to see available folders, and list_inbox or search_emails to get the email UID.",
        inputSchema: z.object({
          uid: z.number().describe("The UID of the email to move"),
          destinationFolder: z.string().describe("The destination folder path (e.g., 'Trash', 'Spam', 'Folders/Work')"),
          sourceFolder: z.string().optional().describe("The source folder (default: INBOX)"),
        }),
        execute: async ({ uid, destinationFolder, sourceFolder }) => {
          logger.info({ uid, destinationFolder, sourceFolder, userId: ctx.userId }, "IMAP tool: move_email invoked");
          try {
            const options = await getImapOptions();
            await moveEmail(options, uid, destinationFolder, sourceFolder ?? "INBOX");
            await ctx.logActivity({
              type: "email_check",
              summary: `Moved email UID ${uid} to ${destinationFolder}`,
              metadata: { uid, destinationFolder, sourceFolder: sourceFolder ?? "INBOX" },
            });
            logger.info({ uid, destinationFolder, userId: ctx.userId }, "IMAP tool: move_email complete");
            return { success: true, uid, movedTo: destinationFolder };
          } catch (err) {
            logger.error({ err, uid, destinationFolder, userId: ctx.userId }, "IMAP tool: move_email failed");
            return { error: err instanceof Error ? err.message : "Failed to move email" };
          }
        },
      }),

      archive_email: tool({
        description: "Archive an email — automatically detects the Archive folder. Use list_inbox or search_emails first to get the email UID.",
        inputSchema: z.object({
          uid: z.number().describe("The UID of the email to archive"),
          sourceFolder: z.string().optional().describe("The source folder (default: INBOX)"),
        }),
        execute: async ({ uid, sourceFolder }) => {
          logger.info({ uid, sourceFolder, userId: ctx.userId }, "IMAP tool: archive_email invoked");
          try {
            const options = await getImapOptions();
            const archiveFolder = await archiveEmail(options, uid, sourceFolder ?? "INBOX");
            await ctx.logActivity({
              type: "email_check",
              summary: `Archived email UID ${uid} to ${archiveFolder}`,
              metadata: { uid, archiveFolder, sourceFolder: sourceFolder ?? "INBOX" },
            });
            logger.info({ uid, archiveFolder, userId: ctx.userId }, "IMAP tool: archive_email complete");
            return { success: true, uid, archivedTo: archiveFolder };
          } catch (err) {
            logger.error({ err, uid, userId: ctx.userId }, "IMAP tool: archive_email failed");
            return { error: err instanceof Error ? err.message : "Failed to archive email" };
          }
        },
      }),
    };
  },

  async loadWidgetData(ctx) {
    logger.debug({ userId: ctx.userId }, "IMAP: loading widget data");
    try {
      const opts = await ctx.getOptions<Partial<ImapOptions>>();
      if (!opts.username || !opts.password) {
        logger.debug("IMAP: widget skipped — not configured");
        return { configured: false, unreadCount: 0, recentEmails: [] };
      }
      const options: ImapOptions = {
        host: opts.host ?? "127.0.0.1",
        port: opts.port ?? 1143,
        username: opts.username,
        password: opts.password,
        tls: opts.tls ?? false,
      };
      const [unreadCount, recentEmails] = await Promise.all([getUnreadCount(options), listInbox(options, 5)]);
      logger.info({ unreadCount, recentCount: recentEmails.length }, "IMAP: widget data loaded");
      return { configured: true, unreadCount, recentEmails };
    } catch (err) {
      logger.error({ err, userId: ctx.userId }, "IMAP: widget data load failed");
      return {
        configured: true,
        error: err instanceof Error ? err.message : "Connection failed",
        unreadCount: 0,
        recentEmails: [],
      };
    }
  },

  async checkHealth(ctx) {
    logger.debug({ userId: ctx.userId }, "IMAP: health check");
    const opts = await ctx.getOptions<Partial<ImapOptions>>();
    if (!opts.username || !opts.password) {
      return { status: "warning", message: "Not configured" };
    }
    try {
      const options: ImapOptions = {
        host: opts.host ?? "127.0.0.1",
        port: opts.port ?? 1143,
        username: opts.username,
        password: opts.password,
        tls: opts.tls ?? false,
      };
      const unread = await getUnreadCount(options);
      logger.info({ unread }, "IMAP: health check passed");
      return { status: "ok", message: `Connected — ${unread} unread` };
    } catch (err) {
      logger.error({ err, userId: ctx.userId }, "IMAP: health check failed");
      return { status: "error", message: err instanceof Error ? err.message : "Connection failed" };
    }
  },
};
