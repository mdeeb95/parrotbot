import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@parrot/db/kb-schema": path.resolve(
        __dirname,
        "../packages/db/src/kb-schema.ts",
      ),
      "@parrot/db/schema": path.resolve(
        __dirname,
        "../packages/db/src/schema.ts",
      ),
      "@parrot/db": path.resolve(__dirname, "./test/mocks/parrot-db.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
