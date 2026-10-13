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

  // 2. Build single executable
  console.log("🔨 Building Single Executable Application...");
  try {
    // Modern Node.js --build-sea
    execSync("node --build-sea sea-config.json", {
      cwd: cliDir,
      stdio: "inherit",
    });
    await fs.chmod(targetBinary, 0o755);
  } catch (err) {
    console.warn("Falling back to manual postject injection:", err);
    // Fallback: postject injection
    const blobPath = path.join(distDir, "sea-prep.blob");
    execSync("node --experimental-sea-config sea-config.json", {
      cwd: cliDir,
      stdio: "inherit",
    });
    await fs.copyFile(process.execPath, targetBinary);
    await fs.chmod(targetBinary, 0o755);
    const sentinelFuse = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
    const machoFlag = process.platform === "darwin" ? "--macho-segment-name NODE_SEA" : "";
    execSync(
      `pnpm exec postject "${targetBinary}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse ${sentinelFuse} ${machoFlag} --overwrite`,
      { stdio: "inherit" }
    );
  }

  // 3. Codesign on macOS if needed
  if (process.platform === "darwin") {
    try {
      execSync(`codesign --sign - "${targetBinary}"`);
    } catch {
      // ignore
    }
  }

  console.log(`🎉 Single Executable Application built successfully: ${targetBinary}`);
}

main().catch((err) => {
  console.error("❌ Failed to build CLI SEA:", err);
  process.exit(1);
});
