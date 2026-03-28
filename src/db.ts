import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { startupTimer } from "#/lib/startup-timer";
import { PrismaClient } from "./generated/prisma/client.js";

const dbTimer = startupTimer("prisma client");
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });
dbTimer();
