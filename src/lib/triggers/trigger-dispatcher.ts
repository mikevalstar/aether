import { search } from "@metrichor/jmespath";
import { logger } from "#/lib/logger";
import { executeTrigger } from "#/lib/triggers/trigger-executor";
import { getTriggerConfigs } from "#/lib/triggers/trigger-watcher";

/**
 * Fire a trigger event. Matches the event type against all enabled trigger
 * configs, evaluates JMESPath patterns, and spawns execution for each match.
 *
 * Fire-and-forget — executions run concurrently, errors are logged but not thrown.
 */
export function fireTrigger(type: string, payload: Record<string, unknown>): void {
  const configs = getTriggerConfigs();

  logger.debug({ type, configCount: configs.size }, "fireTrigger dispatching");

  for (const [filename, config] of configs) {
    // Must match type and be enabled
    if (config.type !== type || !config.enabled) continue;

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
    logger.info({ trigger: filename, type, pattern: config.pattern }, "Trigger matched — executing");
    executeTrigger(filename, config, payload).catch((err) => {
      logger.error({ trigger: filename, err }, "Trigger execution failed");
    });
  }
}
