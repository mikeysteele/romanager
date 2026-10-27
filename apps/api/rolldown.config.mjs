import { defineConfig } from "rolldown";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  input: {
    "main": resolve(__dirname, "./main.ts"),
    "workers/scanner": resolve(__dirname, "./src/workers/scanner.ts"),
    "workers/deletion.worker": resolve(__dirname, "./src/workers/deletion.worker.ts"),
  },
  output: {
    dir: resolve(__dirname, "dist"),
    format: "esm",
    entryFileNames: "[name].js",
    chunkFileNames: "chunks/[name]-[hash].js",
  },
  platform: "node",
  external: (id) => {
    if (id.startsWith(".") || id.startsWith("/") || id.startsWith("@repo/")) {
      return false;
    }
    return true;
  },
});
