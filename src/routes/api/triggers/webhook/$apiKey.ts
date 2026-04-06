import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db";
import { ensureAppRuntimeStarted } from "#/lib/app-runtime";
import { logger } from "#/lib/logger";
import { fireTrigger } from "#/lib/triggers/trigger-dispatcher";

export const Route = createFileRoute("/api/triggers/webhook/$apiKey")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { apiKey } = params;

        // Look up webhook by API key
        const webhook = await prisma.webhook.findUnique({
          where: { apiKey },
        });

        if (!webhook) {
          return new Response(JSON.stringify({ error: "Invalid API key" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Validate Content-Type
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Parse JSON body
        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Update last received timestamp (fire-and-forget)
        prisma.webhook
          .update({
            where: { id: webhook.id },
            data: { lastReceivedAt: new Date() },
          })
          .catch((err) => logger.error({ err, webhookId: webhook.id }, "Failed to update webhook lastReceivedAt"));

        // Ensure trigger watcher is initialized before dispatching
        await ensureAppRuntimeStarted();

        // Dispatch to matching triggers (fire-and-forget)
        fireTrigger(webhook.type, payload);
        logger.info(
          { webhookId: webhook.id, webhookName: webhook.name, type: webhook.type, payloadKeys: Object.keys(payload) },
          "Webhook received — dispatching to triggers",
        );

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
