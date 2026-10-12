import { defineConfig } from "drizzle-kit";
import process from "node:process";

export default defineConfig({
  schema: "./apps/api/src/db/schema.ts",
  out: process.env.DRIZZLE_OUT || "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_URL || "file:romanager.db",
  },
});
