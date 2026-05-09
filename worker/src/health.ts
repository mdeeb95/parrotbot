import { createServer, Server } from "node:http";
import { db } from "@parrot/db";
import { sql } from "drizzle-orm";
import type { Client } from "tmi.js";
import { logger } from "./logger";

type DbPing = { ok: boolean; checkedAt: number };
const PING_TTL_MS = 10_000;
let cachedPing: DbPing | null = null;

async function pingDb(): Promise<boolean> {
  if (cachedPing && Date.now() - cachedPing.checkedAt < PING_TTL_MS) {
    return cachedPing.ok;
  }
  try {
    await db.execute(sql`SELECT 1`);
    cachedPing = { ok: true, checkedAt: Date.now() };
    return true;
  } catch (err) {
    logger.warn({ err }, "db ping failed");
    cachedPing = { ok: false, checkedAt: Date.now() };
    return false;
  }
}

function ircConnected(client: Client): boolean {
  try {
    const state = client.readyState();
    return state === "OPEN";
  } catch {
    return false;
  }
}

export function startHealthServer(deps: {
  client: Client;
  channelCount: () => number;
  port: number;
}): Server {
  const server = createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/health") {
      res.statusCode = 404;
      res.end();
      return;
    }
    const irc = ircConnected(deps.client);
    const dbOk = await pingDb();
    const ok = irc && dbOk;
    res.statusCode = ok ? 200 : 503;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        status: ok ? "ok" : "degraded",
        irc_connected: irc,
        db_connected: dbOk,
        channels: deps.channelCount(),
      }),
    );
  });
  server.listen(deps.port, () => {
    logger.info({ port: deps.port }, "health server listening");
  });
  return server;
}
