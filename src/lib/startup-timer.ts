import { logger } from "#/lib/logger";

/**
 * Lightweight utility for timing startup tasks.
 *
 * Usage:
 *   const done = startupTimer("task scheduler");
 *   // ... do work ...
 *   done();                        // logs: "task scheduler ready (123ms)"
 *   done({ taskCount: 5 });        // logs with extra structured fields
 *
 * Early-exit (skipped tasks):
 *   done.skip("no config dir");    // logs: "task scheduler skipped: no config dir (2ms)"
 */
export function startupTimer(label: string) {
  const start = performance.now();

  function done(extra?: Record<string, unknown>) {
    const ms = Math.round(performance.now() - start);
    logger.info({ ...extra, startupMs: ms }, `${label} ready (${ms}ms)`);
  }

  done.skip = (reason: string, extra?: Record<string, unknown>) => {
    const ms = Math.round(performance.now() - start);
    logger.info({ ...extra, startupMs: ms }, `${label} skipped: ${reason} (${ms}ms)`);
  };

  return done;
}
