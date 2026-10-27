import { getDatabaseDialect } from "./dialect.ts";
import * as schema from "./schema.ts";
import { PgSelectBase } from "drizzle-orm/pg-core";

// Provide .get() compatibility on Postgres select queries for multi-dialect parity
if (!(PgSelectBase.prototype as any).get) {
  (PgSelectBase.prototype as any).get = async function () {
    const rows = await this.limit(1);
    return rows[0];
  };
}

const dbUrl = process.env.DB_URL || "file:romanager.db";
export const dialect = getDatabaseDialect(dbUrl);

let clientInstance: any;
let dbInstance: any;

if (dialect === "postgres") {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { default: postgres } = await import("postgres");

  clientInstance = postgres(dbUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  dbInstance = drizzle(clientInstance, { schema: schema.pgSchema });
} else {
  const { drizzle } = await import("drizzle-orm/libsql");
  const { createClient } = await import("@libsql/client");

  clientInstance = createClient({ url: dbUrl });

  if (dbUrl.startsWith("file:")) {
    try {
      await clientInstance.execute("PRAGMA journal_mode = WAL;");
      await clientInstance.execute("PRAGMA busy_timeout = 5000;");
      await clientInstance.execute("PRAGMA foreign_keys = ON;");
    } catch (err) {
      console.warn("Failed to set SQLite pragmas:", err);
    }
  }

  dbInstance = drizzle(clientInstance, { schema: schema.sqliteSchema });
}

import type { LibSQLDatabase } from "drizzle-orm/libsql";

export const client = clientInstance;
export const db = dbInstance as LibSQLDatabase<typeof schema.sqliteSchema>;
