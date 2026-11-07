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

  const isWindows = process.platform === "win32";
  const binaryName = isWindows ? "romanager-sync.exe" : "romanager-sync";
  const targetBinary = path.join(distDir, binaryName);

  console.log("🔨 Compiling CLI binary with scriptc...");
  execSync(`pnpm exec scriptc build src/main.ts -o dist/${binaryName} --strip`, {
    cwd: cliDir,
    stdio: "inherit",
  });

  if (!isWindows) {
    await fs.chmod(targetBinary, 0o755);
  }

  // Codesign on macOS if needed
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
    if (!isWindows) {
      await fs.chmod(customTarget, 0o755);
    }
    console.log(`🎉 Copied binary to: ${customTarget}`);
  }

  console.log(`🎉 CLI binary built successfully with scriptc: ${targetBinary}`);
}

main().catch((err) => {
  console.error("❌ Failed to build CLI binary:", err);
  process.exit(1);
});
