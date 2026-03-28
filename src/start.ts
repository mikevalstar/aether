import { createMiddleware, createStart } from "@tanstack/react-start";
import { ensureAppRuntimeStarted } from "#/lib/app-runtime";

const appRuntimeMiddleware = createMiddleware().server(async ({ next }) => {
  await ensureAppRuntimeStarted();
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [appRuntimeMiddleware],
}));
