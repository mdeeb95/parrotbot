import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
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
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["app/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    css: false,
  },
});
