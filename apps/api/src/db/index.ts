import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema.ts";

const dbUrl = Deno.env.get("DB_URL") || "file:romanager.db";
const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });
