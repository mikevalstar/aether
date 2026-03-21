import { Mail } from "lucide-react";
import type { PluginActivityType, PluginMeta, PluginOptionField } from "../types";

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
];

export const imapActivityTypes: PluginActivityType[] = [{ type: "email_check", label: "Email Check", icon: Mail }];
