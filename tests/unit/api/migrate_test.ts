import { assertEquals } from "@repo/tests/utils/assert";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { runMigrations, findMigrationsFolder } from "../../../apps/api/src/db/migrate.ts";

test("findMigrationsFolder: finds valid migrations folder with meta/_journal.json", () => {
  const folder = findMigrationsFolder();
  assertEquals(folder !== null, true);
  assertEquals(typeof folder, "string");
});

test("runMigrations: cleanly migrates fresh in-memory database and is idempotent", async () => {
  const client = createClient({ url: "file::memory:?cache=shared" });
  const testDb = drizzle(client);

  // 1. Initial migration run
  const firstSuccess = await runMigrations(undefined, testDb);
  assertEquals(firstSuccess, true);

  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
  const tableNames = tables.rows.map((r) => String(r[0]));

  assertEquals(tableNames.includes("__drizzle_migrations"), true);
  assertEquals(tableNames.includes("roms"), true);
  assertEquals(tableNames.includes("games"), true);
  assertEquals(tableNames.includes("save_files"), true);
  assertEquals(tableNames.includes("save_versions"), true);

  // 2. Second migration run should be idempotent
  const secondSuccess = await runMigrations(undefined, testDb);
  assertEquals(secondSuccess, true);
});
