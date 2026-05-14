import dns from "node:dns";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Railway's *.railway.internal hostnames resolve to IPv6; Node's default
// result order prefers IPv4 and yields ENOTFOUND on cold connections.
dns.setDefaultResultOrder("ipv6first");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

declare global {
  // eslint-disable-next-line no-var
  var __pg__: ReturnType<typeof postgres> | undefined;
}

const client = global.__pg__ ?? postgres(url, { prepare: false });
if (process.env.NODE_ENV !== "production") global.__pg__ = client;

export const db = drizzle(client, { schema });
export { schema };
