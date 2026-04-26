import { formatDistanceToNow } from "date-fns";
import { Mail, MailOpen } from "lucide-react";
import { WidgetCard } from "#/components/dashboard/WidgetCard";
import type { AetherPluginClient, PluginWidget } from "../types";
import type { EmailEnvelope } from "./lib/imap-client";

function InboxWidget({
  data,
}: {
  ctx: { pluginId: string; options: Record<string, unknown> };
  data: Record<string, unknown>;
}) {
  const configured = data.configured as boolean;
  const error = data.error as string | undefined;
  const unreadCount = (data.unreadCount as number) ?? 0;
  const recentEmails = (data.recentEmails as EmailEnvelope[]) ?? [];

  if (!configured) {
    return (
      <WidgetCard icon={Mail} title="Email">
        <p className="text-xs text-muted-foreground">
          Not configured. Go to Settings &gt; Plugins &gt; Email (IMAP) to set up.
        </p>
      </WidgetCard>
    );
  }

  if (error) {
    return (
      <WidgetCard icon={Mail} title="Email">
        <p className="text-xs text-destructive">{error}</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={Mail}
      title="Inbox"
      action={
        unreadCount > 0 ? (
          <span className="rounded-full bg-[var(--coral)] px-2 py-0.5 text-xs font-semibold text-white">
            {unreadCount} unread
          </span>
        ) : null
      }
    >
      {recentEmails.length === 0 ? (
        <p className="text-xs text-muted-foreground">No recent emails</p>
      ) : (
        <ul className="space-y-2">
          {recentEmails.map((email) => (
            <li key={email.uid} className="flex items-start gap-2">
              {email.unread ? (
                <Mail className="mt-0.5 size-3.5 shrink-0 text-[var(--teal)]" />
              ) : (
                <MailOpen className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-xs ${email.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  {email.subject}
                </p>
                <p className="truncate text-[10px] text-muted-foreground/70">
                  {email.from.replace(/<.*>/, "").trim()}
                  {email.date && (
                    <span className="ml-1">· {formatDistanceToNow(new Date(email.date), { addSuffix: true })}</span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

const inboxWidget: PluginWidget = {
  id: "inbox",
  label: "Inbox",
  size: "quarter",
  component: InboxWidget,
};

export const imapClient: AetherPluginClient = {
  widgets: [inboxWidget],
  commands: [
    {
      label: "Email Settings",
      icon: Mail,
      route: "/settings/plugins/imap_email",
    },
  ],
};
