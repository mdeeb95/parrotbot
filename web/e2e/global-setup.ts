import { request } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post("/api/dev/test-login");
  if (!res.ok()) {
    throw new Error(
      `test-login failed: ${res.status()} ${await res.text()}\nMake sure the dev server has E2E_BYPASS_AUTH=1 set.`,
    );
  }
  await mkdir(path.resolve("e2e/.auth"), { recursive: true });
  await ctx.storageState({ path: "e2e/.auth/state.json" });
  await ctx.dispose();
}
