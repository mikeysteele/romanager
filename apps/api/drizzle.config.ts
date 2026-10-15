import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: process.env.DRIZZLE_OUT || "../../drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_URL || "file:romanager.db",
  },
});
