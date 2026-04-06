import { logger } from "#/lib/logger";
import { closeScheduler, initScheduler } from "#/lib/tasks/task-scheduler";
import { closeTriggerWatcher, initTriggerWatcher } from "#/lib/triggers/trigger-watcher";
import { closeWorkflowWatcher, initWorkflowWatcher } from "#/lib/workflows/workflow-watcher";

type AppRuntimeState = {
  startPromise: Promise<void> | null;
  cleanupRegistered: boolean;
  shutdownHandler: (() => void) | null;
};

declare global {
  var __aetherAppRuntimeState: AppRuntimeState | undefined;
}

function getAppRuntimeState(): AppRuntimeState {
  globalThis.__aetherAppRuntimeState ??= {
    startPromise: null,
    cleanupRegistered: false,
    shutdownHandler: null,
  };

  return globalThis.__aetherAppRuntimeState;
}

export function ensureAppRuntimeStarted(): Promise<void> {
  const state = getAppRuntimeState();
  if (state.startPromise) return state.startPromise;

  logger.info("Starting app runtime bootstrap");

  state.startPromise = Promise.all([initWorkflowWatcher(), initTriggerWatcher(), initScheduler()])
    .then(() => {
      logger.info("App runtime bootstrap complete");
    })
    .catch((error) => {
      logger.error({ err: error }, "App runtime bootstrap failed");
      state.startPromise = null;
      throw error;
    });

  return state.startPromise;
}

export async function closeAppRuntime(): Promise<void> {
  const state = getAppRuntimeState();
  state.startPromise = null;

  await Promise.allSettled([closeScheduler(), closeWorkflowWatcher(), closeTriggerWatcher()]);
}

function unregisterCleanup(): void {
  const state = getAppRuntimeState();
  if (!state.cleanupRegistered || !state.shutdownHandler) return;

  process.off("SIGTERM", state.shutdownHandler);
  process.off("SIGINT", state.shutdownHandler);
  state.cleanupRegistered = false;
  state.shutdownHandler = null;
}

function registerCleanup(): void {
  const state = getAppRuntimeState();
  if (state.cleanupRegistered) return;

  const shutdownHandler = () => {
    void closeAppRuntime();
  };

  process.on("SIGTERM", shutdownHandler);
  process.on("SIGINT", shutdownHandler);

  logger.info("App runtime cleanup handlers registered");

  state.cleanupRegistered = true;
  state.shutdownHandler = shutdownHandler;
}

registerCleanup();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unregisterCleanup();
    void closeAppRuntime();
  });
}
