import { search } from "@metrichor/jmespath";
import { prisma } from "#/db";
import { logger } from "#/lib/logger";
import { executeTrigger } from "#/lib/triggers/trigger-executor";
import { getTriggerConfigs } from "#/lib/triggers/trigger-watcher";

/**
 * Fire a trigger event. Matches the event type against all enabled trigger
 * configs, evaluates JMESPath patterns, and spawns execution for each match.
 *
 * The optional `firingUserId` identifies which user caused the event (e.g.,
 * webhook owner, plugin context user). It is used to:
 * - Filter trigger configs by their `user` frontmatter field
 * - Run the trigger as that user (so they get their own plugin tools, etc.)
 *
 * If `firingUserId` is omitted, the trigger runs as the first admin user and
 * only matches configs with no `user` field set or `user: "all"`.
 *
 * Fire-and-forget — executions run concurrently, errors are logged but not thrown.
 */
export function fireTrigger(type: string, payload: Record<string, unknown>, firingUserId?: string): void {
  // Run async work without blocking the caller
  void doFireTrigger(type, payload, firingUserId).catch((err) => {
    logger.error({ type, err }, "fireTrigger failed");
  });
}

async function doFireTrigger(type: string, payload: Record<string, unknown>, firingUserId?: string): Promise<void> {
  const configs = getTriggerConfigs();

  logger.debug({ type, configCount: configs.size, firingUserId }, "fireTrigger dispatching");

  // Resolve firing user's email (for matching against config.user)
  let firingUserEmail: string | undefined;
  if (firingUserId) {
    const user = await prisma.user.findUnique({
      where: { id: firingUserId },
      select: { email: true },
    });
    firingUserEmail = user?.email;
  }

  for (const [filename, config] of configs) {
    // Must match type and be enabled
    if (config.type !== type || !config.enabled) continue;

    // User scoping check
    if (config.user && config.user !== "all") {
      if (!firingUserEmail || config.user !== firingUserEmail) {
        logger.debug(
          { trigger: filename, configUser: config.user, firingUserEmail },
          "Trigger user filter — skipping (user mismatch)",
        );
        continue;
      }
    }

    // Evaluate JMESPath pattern if present
    if (config.pattern) {
      try {
        const result = search(payload as unknown as Parameters<typeof search>[0], config.pattern);
        if (!result) continue;
      } catch (err) {
        logger.warn(
          { trigger: filename, pattern: config.pattern, err },
          "JMESPath pattern evaluation failed — skipping trigger",
        );
        continue;
      }
    }

    // Fire-and-forget execution
    logger.info({ trigger: filename, type, pattern: config.pattern, firingUserId }, "Trigger matched — executing");
    executeTrigger(filename, config, payload, firingUserId).catch((err) => {
      logger.error({ trigger: filename, err }, "Trigger execution failed");
    });
  }
}
