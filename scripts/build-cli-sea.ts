import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliDir = path.resolve(__dirname, "../apps/cli");
const distDir = path.join(cliDir, "dist");

async function main() {
  await fs.mkdir(distDir, { recursive: true });

  // 1. Bundle with rolldown
  console.log("📦 Bundling CLI with Rolldown...");
  execSync(
    "pnpm exec rolldown src/main.ts -d dist -f cjs --entryFileNames bundle.cjs --platform node",
    { cwd: cliDir, stdio: "inherit" }
  );

  const isWindows = process.platform === "win32";
  const binaryName = isWindows ? "romanager-sync.exe" : "romanager-sync";
  const targetBinary = path.join(distDir, binaryName);

  // 2. Build single executable via native Node 26 --build-sea
  console.log("🔨 Building Single Executable Application...");
  execSync("node --build-sea sea-config.json", {
    cwd: cliDir,
    stdio: "inherit",
  });
  await fs.chmod(targetBinary, 0o755);

  // 3. Codesign on macOS if needed
  if (process.platform === "darwin") {
    try {
      execSync(`codesign --sign - "${targetBinary}"`);
    } catch {
      // ignore
    }
  }

  if (process.env.OUTPUT_NAME && process.env.OUTPUT_NAME !== binaryName) {
    const customTarget = path.join(distDir, process.env.OUTPUT_NAME);
    await fs.copyFile(targetBinary, customTarget);
    await fs.chmod(customTarget, 0o755);
    console.log(`🎉 Copied binary to: ${customTarget}`);
  }

  console.log(`🎉 Single Executable Application built successfully: ${targetBinary}`);
}

main().catch((err) => {
  console.error("❌ Failed to build CLI SEA:", err);
  process.exit(1);
});
