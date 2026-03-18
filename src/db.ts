import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

// Eager-init the task scheduler and workflow watcher on server start (side-effect imports)
import("#/lib/task-scheduler").catch(() => {});
import("#/lib/workflow-watcher").catch(() => {});
