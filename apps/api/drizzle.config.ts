import { defineConfig } from "drizzle-kit";
import process from "node:process";

export default defineConfig({
  schema: "./apps/api/src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_URL || "file:romanager.db",
  },
});
