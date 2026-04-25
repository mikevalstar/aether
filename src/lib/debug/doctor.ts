/**
 * `aether-debug doctor` checks. Each check returns a structured result so the
 * CLI can render a table and exit non-zero when any critical check fails.
 */

import { promises as fs } from "node:fs";
import net from "node:net";
import path from "node:path";
import { prisma } from "#/db";
import { OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";

export type CheckStatus = "ok" | "warn" | "fail";

export type CheckResult = {
  name: string;
  status: CheckStatus;
  detail: string;
  /** Whether failure of this check should make `doctor` exit non-zero. */
  critical: boolean;
};

export async function runDoctorChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  results.push(await checkDevServer());
  results.push(await checkDatabase());
  results.push(checkEnv("ANTHROPIC_API_KEY", true));
  results.push(checkEnv("OPENROUTER_API_KEY", false));
  results.push(checkEnv("MINIMAX_API_KEY", false));
  results.push(checkEnv("EXA_API_KEY", false));
  results.push(await checkObsidianVault());
  results.push(await checkLogDir());
  results.push(await checkLastActivity());
  results.push(await checkUsersExist());

  return results;
}

async function checkDevServer(): Promise<CheckResult> {
  const port = Number(process.env.PORT ?? 3000);
  const reachable = await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    const onDone = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(500);
    socket.once("connect", () => onDone(true));
    socket.once("timeout", () => onDone(false));
    socket.once("error", () => onDone(false));
    socket.connect(port, "127.0.0.1");
  });
  return {
    name: "Dev server",
    status: reachable ? "ok" : "warn",
    detail: reachable ? `listening on :${port}` : `not listening on :${port} (run \`pnpm dev\`)`,
    critical: false,
  };
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    const userCount = await prisma.user.count();
    return {
      name: "Database",
      status: "ok",
      detail: `connected (${userCount} user${userCount === 1 ? "" : "s"})`,
      critical: true,
    };
  } catch (err) {
    return {
      name: "Database",
      status: "fail",
      detail: err instanceof Error ? err.message : "unreachable",
      critical: true,
    };
  }
}

function checkEnv(name: string, critical: boolean): CheckResult {
  const set = !!process.env[name];
  return {
    name: `env ${name}`,
    status: set ? "ok" : critical ? "fail" : "warn",
    detail: set ? "set" : "not set",
    critical,
  };
}

async function checkObsidianVault(): Promise<CheckResult> {
  if (!OBSIDIAN_DIR) {
    return {
      name: "Obsidian vault",
      status: "warn",
      detail: "OBSIDIAN_DIR not set",
      critical: false,
    };
  }
  try {
    const stat = await fs.stat(OBSIDIAN_DIR);
    if (!stat.isDirectory()) {
      return { name: "Obsidian vault", status: "fail", detail: `${OBSIDIAN_DIR} is not a directory`, critical: false };
    }
    return { name: "Obsidian vault", status: "ok", detail: OBSIDIAN_DIR, critical: false };
  } catch (err) {
    return {
      name: "Obsidian vault",
      status: "fail",
      detail: `${OBSIDIAN_DIR}: ${err instanceof Error ? err.message : "unreadable"}`,
      critical: false,
    };
  }
}

async function checkLogDir(): Promise<CheckResult> {
  const dir = path.resolve(process.cwd(), process.env.LOG_DIR ?? "./logs");
  const today = new Date().toISOString().slice(0, 10);
  try {
    const entries = await fs.readdir(dir);
    const todays = entries.filter((e) => e.startsWith(`aether.${today}`));
    if (todays.length === 0) {
      return {
        name: "Log directory",
        status: "warn",
        detail: `${dir}: no log file for ${today} yet`,
        critical: false,
      };
    }
    return {
      name: "Log directory",
      status: "ok",
      detail: `${dir} (${entries.length} files, ${todays.length} today)`,
      critical: false,
    };
  } catch (err) {
    return {
      name: "Log directory",
      status: "fail",
      detail: `${dir}: ${err instanceof Error ? err.message : "unreadable"}`,
      critical: false,
    };
  }
}

async function checkLastActivity(): Promise<CheckResult> {
  try {
    const last = await prisma.activityLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    if (!last) {
      return { name: "Last activity", status: "warn", detail: "no activity logged yet", critical: false };
    }
    const ageMs = Date.now() - last.createdAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    return {
      name: "Last activity",
      status: ageHours > 168 ? "warn" : "ok", // 7 days
      detail: `${last.createdAt.toISOString()} (${Math.round(ageHours)}h ago)`,
      critical: false,
    };
  } catch (err) {
    return {
      name: "Last activity",
      status: "fail",
      detail: err instanceof Error ? err.message : "query failed",
      critical: false,
    };
  }
}

async function checkUsersExist(): Promise<CheckResult> {
  try {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount === 0) {
      return {
        name: "Admin user",
        status: "fail",
        detail: "no admin user — run `pnpm create:first-admin`",
        critical: true,
      };
    }
    return { name: "Admin user", status: "ok", detail: `${adminCount} admin user(s)`, critical: true };
  } catch (err) {
    return {
      name: "Admin user",
      status: "fail",
      detail: err instanceof Error ? err.message : "query failed",
      critical: true,
    };
  }
}
