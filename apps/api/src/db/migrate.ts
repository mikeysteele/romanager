import { migrate } from "drizzle-orm/libsql/migrator";
import { sql } from "drizzle-orm";
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
 * If the database already has tables created (e.g. from a previous drizzle-kit push or manual schema)
 * but __drizzle_migrations is empty, baseline it so migrations don't fail with duplicate table/column errors.
 */
async function baselineExistingDatabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  database: LibSQLDatabase<any>,
  migrationsFolder: string
): Promise<void> {
  try {
    const tableCheck = await database.all(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('roms', 'games', 'systems')`
    );
    if (!tableCheck || tableCheck.length === 0) {
      return; // Fresh database, standard migrations will run cleanly
    }

    const migTableCheck = await database.all(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`
    );

    let hasEntries = false;
    if (migTableCheck && migTableCheck.length > 0) {
      const rows = await database.all(sql`SELECT count(*) as count FROM __drizzle_migrations`);
      const row = rows[0] as Record<string, unknown> | undefined;
      hasEntries = Boolean(row && Number(row.count ?? Object.values(row)[0] ?? 0) > 0);
    }

    if (!hasEntries) {
      console.log("[Database] Pre-existing schema detected without migration history. Baselining migrations...");
      await database.run(sql`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash text NOT NULL,
          created_at numeric
        )
      `);

      const journalFile = path.resolve(migrationsFolder, "meta", "_journal.json");
      if (fs.existsSync(journalFile)) {
        const journal = JSON.parse(fs.readFileSync(journalFile, "utf-8"));
        for (const entry of journal.entries || []) {
          await database.run(
            sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${entry.tag}, ${entry.when})`
          );
        }
        console.log(`[Database] Baselined ${journal.entries?.length || 0} existing migrations.`);
      }
    }
  } catch (err) {
    console.warn("[Database] Baselining check notice:", err);
  }
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

  await baselineExistingDatabase(database, migrationsFolder);

  console.log(`[Database] Applying database migrations from ${migrationsFolder}...`);
  try {
    await migrate(database, { migrationsFolder });
    console.log("[Database] Database migrations applied successfully.");
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate column name") || msg.includes("already exists")) {
      console.warn("[Database] Notice during migrations (tables/columns already present):", msg);
      return true;
    }
    console.error("[Database] Migration failed:", err);
    throw err;
  }
}
