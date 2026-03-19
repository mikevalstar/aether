import { appendFileSync, mkdirSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { createLogger, defineConfig } from "vite";

// ── Vite logger that also writes to logs/vite.log ──────────────────
const logDir = process.env.LOG_DIR ?? "./logs";
mkdirSync(logDir, { recursive: true });
const logFile = `${logDir}/vite.log`;

const viteLogger = createLogger();
const originalInfo = viteLogger.info.bind(viteLogger);
const originalWarn = viteLogger.warn.bind(viteLogger);
const originalError = viteLogger.error.bind(viteLogger);

function writeLog(level: string, msg: string) {
  const line = `${new Date().toISOString()} [${level}] ${msg.replace(/\x1b\[[0-9;]*m/g, "").trim()}\n`;
  try {
    appendFileSync(logFile, line);
  } catch {
    // ignore write errors
  }
}

viteLogger.info = (msg, opts) => {
  originalInfo(msg, opts);
  writeLog("info", msg);
};
viteLogger.warn = (msg, opts) => {
  originalWarn(msg, opts);
  writeLog("warn", msg);
};
viteLogger.error = (msg, opts) => {
  originalError(msg, opts);
  writeLog("error", msg);
};

// ── Config ──────────────────────────────────────────────────────────
const config = defineConfig({
  customLogger: viteLogger,
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    allowedHosts: [".trycloudflare.com", "aether-test.neural.kitchen"],
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
});

export default config;
