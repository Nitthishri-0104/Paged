import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Integration tests share one Next.js server + test database; each
    // test creates its own randomly-emailed user rather than relying on
    // isolation between files, but running files one at a time keeps
    // output easy to read and avoids hammering the single dev server.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
