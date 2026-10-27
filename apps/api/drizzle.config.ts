import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DB_URL || "";
const isPg =
  process.env.DIALECT === "postgresql" ||
  process.env.DIALECT === "postgres" ||
  dbUrl.startsWith("postgres://") ||
  dbUrl.startsWith("postgresql://");

export default defineConfig(
  isPg
    ? {
        schema: "./src/db/schema.pg.ts",
        out: process.env.DRIZZLE_OUT || "../../drizzle/pg",
        dialect: "postgresql",
        dbCredentials: {
          url: process.env.DB_URL || "postgres://romanager:romanager@localhost:5432/romanager",
        },
      }
    : {
        schema: "./src/db/schema.sqlite.ts",
        out: process.env.DRIZZLE_OUT || "../../drizzle",
        dialect: "sqlite",
        dbCredentials: {
          url: process.env.DB_URL || "file:romanager.db",
        },
      }
);
