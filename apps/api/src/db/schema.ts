import { sql } from "drizzle-orm";
import { text, integer, sqliteTable, primaryKey } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const systems = sqliteTable("systems", {
  id: text("id").primaryKey(), // Changed to text for deterministic ID
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  path: text("path"),
});
export const insertSystemSchema = createInsertSchema(systems);
export const selectSystemSchema = createSelectSchema(systems);

export const games = sqliteTable("games", {
  id: text("id").primaryKey(), // RAWG ID or UUID
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"), // RAWG: description_raw
  backgroundImage: text("background_image"), // RAWG: background_image
  released: text("released"), // ISO Date string
  rating: integer("rating", { mode: 'number' }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);

export const roms = sqliteTable("roms", {
  id: text("id").primaryKey(),
  gameId: text("game_id").references(() => games.id),
  systemId: text("system_id").references(() => systems.id),
  filename: text("filename").notNull(),
  path: text("path").notNull().unique(),
  size: integer("size", { mode: 'number' }).notNull(),
  region: text("region"), // e.g., "USA", "EUR"
  crc32: text("crc32"),
  md5: text("md5"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  pendingDelete: integer("pending_delete", { mode: 'boolean' })
    .notNull()
    .default(false),
});
export const insertRomSchema = createInsertSchema(roms);
export const selectRomSchema = createSelectSchema(roms);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const insertSettingSchema = createInsertSchema(settings);
export const selectSettingSchema = createSelectSchema(settings);

export const scannedFiles = sqliteTable("scanned_files", {
  id: text("id").primaryKey(),
  path: text("path").notNull().unique(),
  filename: text("filename").notNull(),
  size: integer("size", { mode: 'number' }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
export const insertScannedFileSchema = createInsertSchema(scannedFiles);
export const selectScannedFileSchema = createSelectSchema(scannedFiles);

export const platforms = sqliteTable("platforms", {
  id: text("id").primaryKey(), 
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});
export const insertPlatformSchema = createInsertSchema(platforms);
export const selectPlatformSchema = createSelectSchema(platforms);

export const gamePlatforms = sqliteTable("game_platforms", {
  gameId: text("game_id").notNull().references(() => games.id),
  platformId: text("platform_id").notNull().references(() => platforms.id),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.gameId, table.platformId] }),
  };
});
export const insertGamePlatformSchema = createInsertSchema(gamePlatforms);
export const selectGamePlatformSchema = createSelectSchema(gamePlatforms);
