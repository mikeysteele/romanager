import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    setupFiles: [path.resolve(__dirname, "tests/vitest-setup.ts")],
    globalSetup: [path.resolve(__dirname, "tests/vitest-global-setup.ts")],
    include: [
      "tests/api/**/*_test.ts",
      "tests/unit/api/**/*_test.ts",
      "tests/unit/shared/**/*_test.ts",
      "tests/unit/cli/**/*_test.ts",
      "tests/unit/ui/**/*_test.ts",
    ],
    environmentMatchGlobs: [
      ["tests/unit/ui/**", "jsdom"],
    ],
  },
  resolve: {
    alias: [
      { find: /^@repo\/tests\/(.*)$/, replacement: path.resolve(__dirname, "tests/$1") },
      { find: "@repo/shared", replacement: path.resolve(__dirname, "packages/shared/mod.ts") },
      { find: "@repo/ui-components", replacement: path.resolve(__dirname, "packages/ui-components/mod.ts") },
    ],
  },
});
