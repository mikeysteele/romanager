import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema.ts";

const dbUrl = process.env.DB_URL || "file:romanager.db";
const client = createClient({ url: dbUrl });

if (dbUrl.startsWith("file:")) {
  try {
    await client.execute("PRAGMA journal_mode = WAL;");
    await client.execute("PRAGMA busy_timeout = 5000;");
    await client.execute("PRAGMA foreign_keys = ON;");
  } catch (err) {
    console.warn("Failed to set SQLite pragmas:", err);
  }
}

export const db = drizzle(client, { schema });
