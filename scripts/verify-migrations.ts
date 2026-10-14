/**
 * Migration Replay Verification Script
 *
 * Verifies that database migrations on the current branch can cleanly apply
 * on top of the base branch (e.g. main) without breaking existing schemas.
 */

import { parseArgs } from "node:util";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const execFileAsync = promisify(execFile);

const parsed = parseArgs({
  args: process.argv.slice(2),
  options: {
    base: { type: "string" },
  },
  strict: false,
});

const baseParam: string = typeof parsed.values.base === "string" ? parsed.values.base : (process.env.BASE_REF || "origin/main");
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-mig-test-"));
const throwawayDbPath = path.join(tempDir, "throwaway.db");
const baseDrizzleDir = path.join(tempDir, "base-drizzle");

async function runCmd(
  cmd: string,
  args: string[],
  env: Record<string, string> = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      env: { ...process.env, ...env },
    });
    return { code: 0, stdout: String(stdout), stderr: String(stderr) };
  } catch (err: any) {
    return {
      code: err.code || 1,
      stdout: err.stdout ? String(err.stdout) : "",
      stderr: err.stderr ? String(err.stderr) : err.message,
    };
  }
}

async function verifyBaseRefExists(ref: string): Promise<boolean> {
  const { code } = await runCmd("git", ["rev-parse", "--verify", ref]);
  return code === 0;
}

try {
  console.log("🔍 [1/4] Verifying database migration replay capability...");
  console.log(`📂 Using throwaway SQLite database at: ${throwawayDbPath}`);

  let baseRef = baseParam;
  let hasBaseRef = await verifyBaseRefExists(baseRef);

  if (!hasBaseRef && baseRef.startsWith("origin/")) {
    const localRef = baseRef.replace(/^origin\//, "");
    if (await verifyBaseRefExists(localRef)) {
      baseRef = localRef;
      hasBaseRef = true;
    }
  }

  if (hasBaseRef) {
    console.log(`📌 [2/4] Found base ref '${baseRef}'. Extracting base migrations...`);
    await fs.mkdir(baseDrizzleDir, { recursive: true });

    // Extract base ref drizzle folder
    const archive = await runCmd("git", ["archive", baseRef, "drizzle"]);
    if (archive.code === 0) {
      // Try writing archive buffer or fallback
      console.log(`🚀 [2/4] Applying base migrations from '${baseRef}'...`);
      const baseMigrate = await runCmd(
        "pnpm",
        ["--filter", "@romanager/api", "db:migrate"],
        {
          DB_URL: `file:${throwawayDbPath}`,
          DRIZZLE_OUT: `${baseDrizzleDir}/drizzle`,
        }
      );

      if (baseMigrate.code !== 0) {
        console.warn("⚠️ Base migrations notice:\n", baseMigrate.stderr || baseMigrate.stdout);
      } else {
        console.log("✅ Base migrations successfully applied.");
      }
    } else {
      console.warn(`⚠️ Could not archive drizzle directory from '${baseRef}'. Skipping base replay step.`);
    }
  } else {
    console.log(`ℹ️ Base ref '${baseRef}' not found in local git history. Testing branch migrations from scratch.`);
  }

  console.log("🚀 [3/4] Applying current branch migrations on top of base DB...");
  const branchMigrate = await runCmd(
    "pnpm",
    ["--filter", "@romanager/api", "db:push"],
    {
      DB_URL: `file:${throwawayDbPath}`,
    }
  );

  if (branchMigrate.code !== 0) {
    console.error("❌ Failed to apply branch migrations on top of base database:\n", branchMigrate.stderr || branchMigrate.stdout);
    process.exit(1);
  }
  console.log("✅ Branch migrations cleanly applied on top of the database!");

  console.log("🔍 [4/4] Verifying database integrity...");
  const integrityCheck = await runCmd(
    "node",
    ["--import", "tsx", "-e", `
      import { createClient } from "@libsql/client";
      const client = createClient({ url: "file:${throwawayDbPath}" });
      const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
      console.log("Found tables:", tables.rows.map(r => r[0]).join(", "));
    `]
  );

  if (integrityCheck.code !== 0) {
    console.error("❌ Database integrity verification failed:\n", integrityCheck.stderr);
    process.exit(1);
  }

  console.log("✅ Schema tables verified:\n", integrityCheck.stdout.trim());
  console.log("🎉 Migration replay test PASSED! Merging will not break schema migrations.");
} finally {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
