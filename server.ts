import express from "express";
import { toNodeHandler } from "srvx/node";
// @ts-expect-error — build artifact, only present after `pnpm build`
import handler from "./dist/server/server.js";

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = express();

const nodeHandler = toNodeHandler(handler.fetch);

app.use("/", express.static("dist/client"));
app.use(async (req, res, next) => {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: srvx's toNodeHandler types include Http2ServerRequest fields that Express's Request lacks
    await nodeHandler(req as any, res as any);
  } catch (err) {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`Aether listening on http://localhost:${PORT}`);
});
