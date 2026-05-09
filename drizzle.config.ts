import "dotenv/config";
import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default {
  schema: "./packages/db/src/schema.ts",
  out: "./packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
} satisfies Config;
