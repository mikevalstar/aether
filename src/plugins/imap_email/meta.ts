import { Mail } from "lucide-react";
import type { PluginActivityType, PluginMeta, PluginOptionField, PluginTriggerType } from "../types";

export const imapMeta: PluginMeta = {
  id: "imap_email",
  name: "Email (IMAP)",
  description: "Connect to an IMAP email server (e.g., Proton Mail Bridge) to check and read emails via AI.",
  icon: Mail,
  version: "0.1.0",
  hasHealthCheck: true,
};

export const imapOptionFields: PluginOptionField[] = [
  {
    key: "host",
    label: "IMAP Host",
    type: "text",
    description: "IMAP server hostname",
    default: "127.0.0.1",
    required: true,
  },
  {
    key: "port",
    label: "IMAP Port",
    type: "number",
    description: "IMAP server port",
    default: 1143,
    required: true,
  },
  {
    key: "username",
    label: "Username",
    type: "text",
    description: "IMAP login username (email address)",
    required: true,
  },
  {
    key: "password",
    label: "Password",
    type: "password",
    description: "IMAP login password (app-specific password for Proton Mail Bridge)",
    required: true,
  },
  {
    key: "tls",
    label: "Use TLS",
    type: "boolean",
    description: "Enable TLS encryption (disable for local Proton Mail Bridge)",
    default: false,
  },
  {
    key: "enableTriggers",
    label: "Enable Triggers",
    type: "boolean",
    description: "Poll for new emails every 5 minutes and fire trigger events for matching trigger configs",
    default: false,
  },
];

export const imapActivityTypes: PluginActivityType[] = [{ type: "email_check", label: "Email Check", icon: Mail }];

export const imapTriggerTypes: PluginTriggerType[] = [
  {
    type: "new_email",
    label: "New Email Received",
    description: "Fires when a new unread email is detected in the inbox during polling.",
    instructions: `The \`{{details}}\` payload contains the full email as a JSON object:

\`\`\`json
{
  "uid": 1234,
  "subject": "Meeting notes",
  "from": "alice@example.com",
  "to": "you@example.com",
  "date": "2026-04-06T12:00:00.000Z",
  "body": "Full text content of the email...",
  "messageId": "<abc@mail.example.com>"
}
\`\`\`

The trigger has access to all IMAP tools (list_inbox, read_email, search_emails, move_email, archive_email, list_folders). Use the \`uid\` from the payload to take actions on the email — for example, archiving it or moving it to a folder.

**Pattern examples (JMESPath on the payload):**
- Match sender: \`contains(from, '@example.com')\`
- Match subject: \`contains(subject, 'urgent')\`
- Match all: leave pattern empty`,
  },
];
