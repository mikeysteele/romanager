import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index.ts";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Discovers the drizzle migrations directory by searching environment variables
 * and standard workspace locations relative to this module and CWD.
 */
export function findMigrationsFolder(): string | null {
  const candidatePaths = [
    process.env.DRIZZLE_DIR,
    process.env.DRIZZLE_OUT,
    path.resolve(__dirname, "../../../../drizzle"),
    path.resolve(__dirname, "../../../drizzle"),
    path.resolve(__dirname, "../../drizzle"),
    path.resolve(__dirname, "../drizzle"),
    path.resolve(process.cwd(), "drizzle"),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidatePaths) {
    const journalPath = path.resolve(candidate, "meta", "_journal.json");
    if (fs.existsSync(journalPath)) {
      return path.resolve(candidate);
    }
  }

  return null;
}

/**
 * Runs pending Drizzle migrations using drizzle-orm/libsql/migrator.
 * Can be called at server startup or during test setup.
 */
export async function runMigrations(
  customFolder?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  database: LibSQLDatabase<any> = db
): Promise<boolean> {
  const migrationsFolder = customFolder || findMigrationsFolder();
  if (!migrationsFolder) {
    console.warn("[Database] No migrations folder found with meta/_journal.json; skipping automated migrations.");
    return false;
  }

  console.log(`[Database] Applying database migrations from ${migrationsFolder}...`);
  try {
    await migrate(database, { migrationsFolder });
    console.log("[Database] Database migrations applied successfully.");
    return true;
  } catch (err) {
    console.error("[Database] Migration failed:", err);
    throw err;
  }
}
