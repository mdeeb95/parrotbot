// Side-effect-only module. Imported FIRST in src/index.ts so that
// process.env is populated before any other module (notably @parrot/db,
// which reads DATABASE_URL at import time) is evaluated.
import "dotenv/config";
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Try to load the repo-root .env (one level above the worker package),
// since `npm run dev:worker` from the root sets cwd=root but tsx-watching
// from worker/ would set it to worker/.
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, "..", "..", ".env"), // repo root from worker/src
  join(here, "..", ".env"), // worker/.env if it exists
];
for (const p of candidates) {
  if (existsSync(p)) {
    config({ path: p, override: false });
  }
}
