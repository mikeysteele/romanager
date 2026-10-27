import { describe, it, expect } from "vitest";
import { getDatabaseDialect } from "../../../apps/api/src/db/dialect.ts";
import { findMigrationsFolder } from "../../../apps/api/src/db/migrate.ts";
import fs from "node:fs";
import path from "node:path";

describe("Database Dialect & Multi-Driver Support", () => {
  it("correctly identifies SQLite and PostgreSQL from DB_URL", () => {
    expect(getDatabaseDialect("")).toBe("sqlite");
    expect(getDatabaseDialect("file:romanager.db")).toBe("sqlite");
    expect(getDatabaseDialect("file:/data/romanager.db")).toBe("sqlite");
    expect(getDatabaseDialect("libsql://my-turso-db.turso.io")).toBe("sqlite");

    expect(getDatabaseDialect("postgres://user:pass@localhost:5432/romanager")).toBe("postgres");
    expect(getDatabaseDialect("postgresql://user:pass@db:5432/romanager?sslmode=disable")).toBe("postgres");
  });

  it("finds dialect-specific migrations folder", () => {
    const sqliteFolder = findMigrationsFolder("sqlite");
    expect(sqliteFolder).not.toBeNull();
    const sqliteJournal = JSON.parse(fs.readFileSync(path.resolve(sqliteFolder!, "meta/_journal.json"), "utf-8"));
    expect(sqliteJournal.dialect).toBe("sqlite");

    const pgFolder = findMigrationsFolder("postgres");
    expect(pgFolder).not.toBeNull();
    const pgJournal = JSON.parse(fs.readFileSync(path.resolve(pgFolder!, "meta/_journal.json"), "utf-8"));
    expect(pgJournal.dialect).toBe("postgresql");
  });
});
