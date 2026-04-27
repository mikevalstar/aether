import express from "express";
import { toNodeHandler } from "srvx/node";
import handler from "./dist/server/server.js";

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = express();

const nodeHandler = toNodeHandler(handler.fetch);

app.use("/", express.static("dist/client"));
app.use(async (req, res, next) => {
  try {
    await nodeHandler(req, res);
  } catch (err) {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`Aether listening on http://localhost:${PORT}`);
});
