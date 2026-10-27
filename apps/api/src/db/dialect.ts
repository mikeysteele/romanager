export type SupportedDialect = "sqlite" | "postgres";

/**
 * Determines the database dialect based on DB_URL scheme.
 * Defaults to "sqlite" if unset or pointing to a file/memory/libsql database.
 */
export function getDatabaseDialect(url: string = process.env.DB_URL || ""): SupportedDialect {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgres";
  }
  return "sqlite";
}
