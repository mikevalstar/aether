import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { logger } from "#/lib/logger";

export type ImapOptions = {
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
};

export type EmailEnvelope = {
  uid: number;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
  messageId: string;
};

export type EmailMessage = {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  textBody: string;
  htmlBody?: string;
};

function createClient(options: ImapOptions): ImapFlow {
  return new ImapFlow({
    host: options.host,
    port: options.port,
    auth: {
      user: options.username,
      pass: options.password,
    },
    secure: options.tls,
    // For local Proton Mail Bridge with self-signed certs
    tls: options.tls ? undefined : { rejectUnauthorized: false },
    logger: false,
  });
}

export async function listInbox(options: ImapOptions, limit = 20): Promise<EmailEnvelope[]> {
  logger.info({ host: options.host, port: options.port, limit }, "IMAP: listing inbox");
  const client = createClient(options);
  try {
    await client.connect();
    logger.debug("IMAP: connected for listInbox");
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Use SORT to get UIDs ordered by REVERSE DATE, then fetch only the top N
      // This ensures we always get the most recent emails regardless of sequence order
      const allUids = await client.search({ all: true }, { uid: true });
      if (!allUids || (Array.isArray(allUids) && allUids.length === 0)) {
        logger.info("IMAP: inbox is empty");
        return [];
      }

      const uidArray = Array.isArray(allUids) ? allUids : [];
      logger.info({ totalUids: uidArray.length }, "IMAP: inbox UID count");

      // Proton Mail Bridge UIDs don't correlate with date order.
      // Fetch all envelopes (lightweight — just headers), sort by date, return top N.
      const messages: EmailEnvelope[] = [];
      for await (const msg of client.fetch("1:*", {
        envelope: true,
        flags: true,
        uid: true,
      })) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? "(no subject)",
          from: msg.envelope?.from?.[0]
            ? `${msg.envelope.from[0].name || ""} <${msg.envelope.from[0].address || ""}>`.trim()
            : "Unknown",
          date: msg.envelope?.date?.toISOString() ?? "",
          unread: !msg.flags?.has("\\Seen"),
          messageId: msg.envelope?.messageId ?? "",
        });
      }

      // Sort newest first by date, then return only the requested limit
      messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const result = messages.slice(0, limit);
      logger.info(
        {
          fetched: messages.length,
          returned: result.length,
          newestDate: result[0]?.date,
          oldestDate: result[result.length - 1]?.date,
        },
        "IMAP: listInbox complete",
      );
      return result;
    } finally {
      lock.release();
    }
  } catch (err) {
    logger.error({ err, host: options.host, port: options.port }, "IMAP: listInbox failed");
    throw err;
  } finally {
    await client.logout().catch((err) => logger.debug({ err }, "IMAP: logout failed during cleanup"));
  }
}

export async function readEmail(options: ImapOptions, uid: number): Promise<EmailMessage> {
  logger.info({ uid, host: options.host, port: options.port }, "IMAP: reading email");
  const client = createClient(options);
  try {
    await client.connect();
    logger.debug({ uid }, "IMAP: connected for readEmail");
    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(
        String(uid),
        {
          envelope: true,
          source: true,
          uid: true,
        },
        { uid: true },
      );

      if (!msg) throw new Error(`Email with UID ${uid} not found`);
      if (!msg.source) throw new Error(`Email source not available for UID ${uid}`);

      const parsed = await simpleParser(msg.source);

      logger.info({ uid, subject: parsed.subject }, "IMAP: readEmail complete");
      return {
        uid: msg.uid,
        subject: parsed.subject ?? "(no subject)",
        from: parsed.from?.text ?? "Unknown",
        to: parsed.to
          ? Array.isArray(parsed.to)
            ? parsed.to.map((t: { text: string }) => t.text).join(", ")
            : parsed.to.text
          : "",
        date: parsed.date?.toISOString() ?? "",
        textBody: parsed.text ?? "",
        htmlBody: parsed.html || undefined,
      };
    } finally {
      lock.release();
    }
  } catch (err) {
    logger.error({ err, uid, host: options.host, port: options.port }, "IMAP: readEmail failed");
    throw err;
  } finally {
    await client.logout().catch((err) => logger.debug({ err }, "IMAP: logout failed during cleanup"));
  }
}

export async function searchEmails(options: ImapOptions, query: string, limit = 20): Promise<EmailEnvelope[]> {
  logger.info({ query, limit, host: options.host, port: options.port }, "IMAP: searching emails");
  const client = createClient(options);
  try {
    await client.connect();
    logger.debug("IMAP: connected for searchEmails");
    const lock = await client.getMailboxLock("INBOX");
    try {
      const results = await client.search({
        or: [{ subject: query }, { from: query }, { body: query }],
      });

      if (!results || (Array.isArray(results) && results.length === 0)) {
        logger.info({ query }, "IMAP: search returned no results");
        return [];
      }

      const resultArray = Array.isArray(results) ? results : [];
      logger.info({ query, matchCount: resultArray.length }, "IMAP: search found matches");

      // Fetch all matches, sort by date, return top N (UIDs aren't date-ordered)
      const messages: EmailEnvelope[] = [];
      for await (const msg of client.fetch(
        resultArray.join(","),
        {
          envelope: true,
          flags: true,
          uid: true,
        },
        { uid: true },
      )) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? "(no subject)",
          from: msg.envelope?.from?.[0]
            ? `${msg.envelope.from[0].name || ""} <${msg.envelope.from[0].address || ""}>`.trim()
            : "Unknown",
          date: msg.envelope?.date?.toISOString() ?? "",
          unread: !msg.flags?.has("\\Seen"),
          messageId: msg.envelope?.messageId ?? "",
        });
      }

      messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const result = messages.slice(0, limit);
      logger.info({ query, fetched: messages.length, returned: result.length }, "IMAP: searchEmails complete");
      return result;
    } finally {
      lock.release();
    }
  } catch (err) {
    logger.error({ err, query, host: options.host, port: options.port }, "IMAP: searchEmails failed");
    throw err;
  } finally {
    await client.logout().catch((err) => logger.debug({ err }, "IMAP: logout failed during cleanup"));
  }
}

export async function getUnreadCount(options: ImapOptions): Promise<number> {
  logger.debug({ host: options.host, port: options.port }, "IMAP: getting unread count");
  const client = createClient(options);
  try {
    await client.connect();
    const status = await client.status("INBOX", { unseen: true });
    const count = status.unseen ?? 0;
    logger.info({ unread: count }, "IMAP: unread count retrieved");
    return count;
  } catch (err) {
    logger.error({ err, host: options.host, port: options.port }, "IMAP: getUnreadCount failed");
    throw err;
  } finally {
    await client.logout().catch((err) => logger.debug({ err }, "IMAP: logout failed during cleanup"));
  }
}

export type MailboxInfo = {
  name: string;
  path: string;
  totalMessages: number;
  unreadMessages: number;
  specialUse?: string;
};

export async function listFolders(options: ImapOptions): Promise<MailboxInfo[]> {
  logger.info({ host: options.host, port: options.port }, "IMAP: listing folders");
  const client = createClient(options);
  try {
    await client.connect();
    const mailboxes = await client.list();
    const folders: MailboxInfo[] = [];

    for (const mb of mailboxes) {
      try {
        const status = await client.status(mb.path, { messages: true, unseen: true });
        folders.push({
          name: mb.name,
          path: mb.path,
          totalMessages: status.messages ?? 0,
          unreadMessages: status.unseen ?? 0,
          specialUse: mb.specialUse || undefined,
        });
      } catch {
        // Some folders (e.g., non-selectable) can't be statused
        folders.push({
          name: mb.name,
          path: mb.path,
          totalMessages: 0,
          unreadMessages: 0,
          specialUse: mb.specialUse || undefined,
        });
      }
    }

    logger.info({ folderCount: folders.length }, "IMAP: listFolders complete");
    return folders;
  } catch (err) {
    logger.error({ err, host: options.host, port: options.port }, "IMAP: listFolders failed");
    throw err;
  } finally {
    await client.logout().catch((err) => logger.debug({ err }, "IMAP: logout failed during cleanup"));
  }
}

export async function moveEmail(
  options: ImapOptions,
  uid: number,
  destinationFolder: string,
  sourceFolder = "INBOX",
): Promise<void> {
  logger.info({ uid, sourceFolder, destinationFolder }, "IMAP: moving email");
  const client = createClient(options);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(sourceFolder);
    try {
      await client.messageMove(String(uid), destinationFolder, { uid: true });
      logger.info({ uid, sourceFolder, destinationFolder }, "IMAP: moveEmail complete");
    } finally {
      lock.release();
    }
  } catch (err) {
    logger.error({ err, uid, sourceFolder, destinationFolder }, "IMAP: moveEmail failed");
    throw err;
  } finally {
    await client.logout().catch((err) => logger.debug({ err }, "IMAP: logout failed during cleanup"));
  }
}

export async function archiveEmail(options: ImapOptions, uid: number, sourceFolder = "INBOX"): Promise<string> {
  logger.info({ uid, sourceFolder }, "IMAP: archiving email");
  const client = createClient(options);
  try {
    await client.connect();

    // Find the Archive folder — check for \Archive special use, or common names
    const mailboxes = await client.list();
    const archiveBox =
      mailboxes.find((mb) => mb.specialUse === "\\Archive") ??
      mailboxes.find((mb) => /^archive$/i.test(mb.name)) ??
      mailboxes.find((mb) => /^all mail$/i.test(mb.name));

    if (!archiveBox) {
      throw new Error(`No Archive folder found. Available folders: ${mailboxes.map((m) => m.path).join(", ")}`);
    }

    const lock = await client.getMailboxLock(sourceFolder);
    try {
      await client.messageMove(String(uid), archiveBox.path, { uid: true });
      logger.info({ uid, archiveFolder: archiveBox.path }, "IMAP: archiveEmail complete");
      return archiveBox.path;
    } finally {
      lock.release();
    }
  } catch (err) {
    logger.error({ err, uid, sourceFolder }, "IMAP: archiveEmail failed");
    throw err;
  } finally {
    await client.logout().catch((err) => logger.debug({ err }, "IMAP: logout failed during cleanup"));
  }
}

/**
 * Test the IMAP connection — connects, checks INBOX status, disconnects.
 * Returns a structured result for the UI.
 */
export async function testConnection(options: ImapOptions): Promise<{
  success: boolean;
  message: string;
  details?: { totalMessages: number; unreadMessages: number };
}> {
  logger.info({ host: options.host, port: options.port, user: options.username }, "IMAP: testing connection");
  const client = createClient(options);
  try {
    await client.connect();
    logger.info("IMAP: test connection successful");
    const status = await client.status("INBOX", { messages: true, unseen: true });
    const totalMessages = status.messages ?? 0;
    const unreadMessages = status.unseen ?? 0;
    logger.info({ totalMessages, unreadMessages }, "IMAP: test connection inbox status");
    return {
      success: true,
      message: `Connected successfully. Inbox: ${totalMessages} messages, ${unreadMessages} unread.`,
      details: { totalMessages, unreadMessages },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    logger.error({ err, host: options.host, port: options.port }, "IMAP: test connection failed");
    return { success: false, message };
  } finally {
    await client.logout().catch((err) => logger.debug({ err }, "IMAP: logout failed during cleanup"));
  }
}
