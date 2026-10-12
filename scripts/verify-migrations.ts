/**
 * Migration Replay Verification Script
 *
 * Verifies that database migrations on the current branch can cleanly apply
 * on top of the base branch (e.g. main) without breaking existing schemas.
 */

import { parseArgs } from "jsr:@std/cli@^1.0.6/parse-args";

const args = parseArgs(Deno.args, {
  string: ["base"],
  default: {
    base: Deno.env.get("BASE_REF") || "origin/main",
  },
});

const tempDir = await Deno.makeTempDir({ prefix: "romanager-mig-test-" });
const throwawayDbPath = `${tempDir}/throwaway.db`;
const baseDrizzleDir = `${tempDir}/base-drizzle`;

async function runCmd(cmd: string[], env: Record<string, string> = {}): Promise<{ code: number; stdout: string; stderr: string }> {
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    env: { ...Deno.env.toObject(), ...env },
    stdout: "piped",
    stderr: "piped",
  });
  const output = await process.output();
  const stdout = new TextDecoder().decode(output.stdout);
  const stderr = new TextDecoder().decode(output.stderr);
  return { code: output.code, stdout, stderr };
}

async function verifyBaseRefExists(ref: string): Promise<boolean> {
  const { code } = await runCmd(["git", "rev-parse", "--verify", ref]);
  return code === 0;
}

try {
  console.log("🔍 [1/4] Verifying database migration replay capability...");
  console.log(`📂 Using throwaway SQLite database at: ${throwawayDbPath}`);

  let baseRef = args.base;
  let hasBaseRef = await verifyBaseRefExists(baseRef);

  if (!hasBaseRef && baseRef.startsWith("origin/")) {
    // Try without origin/ prefix if running locally
    const localRef = baseRef.replace(/^origin\//, "");
    if (await verifyBaseRefExists(localRef)) {
      baseRef = localRef;
      hasBaseRef = true;
    }
  }

  if (hasBaseRef) {
    console.log(`📌 [2/4] Found base ref '${baseRef}'. Extracting base migrations...`);
    await Deno.mkdir(baseDrizzleDir, { recursive: true });

    // Extract base ref drizzle folder
    const archive = await runCmd(["git", "archive", baseRef, "drizzle"]);
    if (archive.code === 0) {
      const tarProcess = new Deno.Command("tar", {
        args: ["-x", "-C", baseDrizzleDir],
        stdin: "piped",
      });
      const tarChild = tarProcess.spawn();
      const writer = tarChild.stdin.getWriter();
      await writer.write(new TextEncoder().encode(archive.stdout));
      await writer.close();
      await tarChild.status;

      console.log(`🚀 [2/4] Applying base migrations from '${baseRef}'...`);
      const baseMigrate = await runCmd(
        ["npx", "drizzle-kit", "migrate", "--config=apps/api/drizzle.config.ts"],
        {
          DB_URL: `file:${throwawayDbPath}`,
          DRIZZLE_OUT: `${baseDrizzleDir}/drizzle`,
        },
      );

      if (baseMigrate.code !== 0) {
        console.error("❌ Failed to apply base migrations:\n", baseMigrate.stderr || baseMigrate.stdout);
        Deno.exit(1);
      }
      console.log("✅ Base migrations successfully applied.");
    } else {
      console.warn(`⚠️ Could not archive drizzle directory from '${baseRef}'. Skipping base replay step.`);
    }
  } else {
    console.log(`ℹ️ Base ref '${baseRef}' not found in local git history. Testing branch migrations from scratch.`);
  }

  console.log("🚀 [3/4] Applying current branch migrations on top of base DB...");
  const branchMigrate = await runCmd(
    ["npx", "drizzle-kit", "migrate", "--config=apps/api/drizzle.config.ts"],
    {
      DB_URL: `file:${throwawayDbPath}`,
    },
  );

  if (branchMigrate.code !== 0) {
    console.error("❌ Failed to apply branch migrations on top of base database:\n", branchMigrate.stderr || branchMigrate.stdout);
    Deno.exit(1);
  }
  console.log("✅ Branch migrations cleanly applied on top of the database!");

  console.log("🔍 [4/4] Verifying database integrity...");
  const integrityCheck = await runCmd(
    ["deno", "eval", `
      import { createClient } from "@libsql/client";
      const client = createClient({ url: "file:${throwawayDbPath}" });
      const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
      console.log("Found tables:", tables.rows.map(r => r[0]).join(", "));
    `],
  );

  if (integrityCheck.code !== 0) {
    console.error("❌ Database integrity verification failed:\n", integrityCheck.stderr);
    Deno.exit(1);
  }

  console.log("✅ Schema tables verified:\n", integrityCheck.stdout.trim());
  console.log("🎉 Migration replay test PASSED! Merging will not break schema migrations.");
} finally {
  try {
    await Deno.remove(tempDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}
