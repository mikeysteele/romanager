import { sql } from "drizzle-orm";
import { text, integer, sqliteTable, primaryKey, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const systems = sqliteTable("systems", {
  id: text("id").primaryKey(), // Deterministic ID or RAWG ID
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  path: text("path"),
  esFolder: text("es_folder"),
});
export const insertSystemSchema = createInsertSchema(systems);
export const selectSystemSchema = createSelectSchema(systems);

export const systemFirmware = sqliteTable("system_firmware", {
  id: text("id").primaryKey(),
  systemId: text("system_id").notNull().references(() => systems.id),
  filename: text("filename").notNull(),
  description: text("description"),
  path: text("path").notNull().unique(),
  md5: text("md5"),
  crc32: text("crc32"),
  sha1: text("sha1"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  systemIdIdx: index("system_firmware_system_id_idx").on(table.systemId),
}));
export const insertSystemFirmwareSchema = createInsertSchema(systemFirmware);
export const selectSystemFirmwareSchema = createSelectSchema(systemFirmware);

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
  name: text("name"),
  setType: text("set_type").notNull().default("single"),
  basePath: text("base_path"),
  launchFile: text("launch_file").notNull().default(""),
  filename: text("filename").notNull(),
  path: text("path"),
  size: integer("size", { mode: 'number' }).notNull().default(0),
  totalSize: integer("total_size", { mode: 'number' }).notNull().default(0),
  setHash: text("set_hash"),
  status: text("status").notNull().default("complete"),
  region: text("region"), // e.g., "USA", "EUR"
  crc32: text("crc32"),
  md5: text("md5"),
  sha1: text("sha1"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  pendingDelete: integer("pending_delete", { mode: 'boolean' })
    .notNull()
    .default(false),
}, (table) => ({
  gameIdIdx: index("roms_game_id_idx").on(table.gameId),
  systemIdIdx: index("roms_system_id_idx").on(table.systemId),
  pendingDeleteIdx: index("roms_pending_delete_idx").on(table.pendingDelete),
}));
export const insertRomSchema = createInsertSchema(roms);
export const selectRomSchema = createSelectSchema(roms);

export const romFiles = sqliteTable("rom_files", {
  id: text("id").primaryKey(),
  romId: text("rom_id").notNull().references(() => roms.id, { onDelete: 'cascade' }),
  relPath: text("rel_path").notNull(),
  path: text("path").notNull(),
  filename: text("filename").notNull(),
  size: integer("size", { mode: 'number' }).notNull(),
  sha1: text("sha1"),
  md5: text("md5"),
  crc32: text("crc32"),
  role: text("role").notNull().default("launch"), // "launch" | "track" | "disc" | "descriptor" | "aux"
  mtime: integer("mtime", { mode: 'number' }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  romIdIdx: index("rom_files_rom_id_idx").on(table.romId),
  pathIdx: index("rom_files_path_idx").on(table.path),
}));
export const insertRomFileSchema = createInsertSchema(romFiles);
export const selectRomFileSchema = createSelectSchema(romFiles);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const insertSettingSchema = createInsertSchema(settings);
export const selectSettingSchema = createSelectSchema(settings);

export const scannedSets = sqliteTable("scanned_sets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  setType: text("set_type").notNull().default("single"),
  basePath: text("base_path").notNull(),
  launchFile: text("launch_file").notNull(),
  totalSize: integer("total_size", { mode: 'number' }).notNull().default(0),
  setHash: text("set_hash"),
  status: text("status").notNull().default("complete"),
  ignored: integer("ignored", { mode: 'boolean' }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  ignoredIdx: index("scanned_sets_ignored_idx").on(table.ignored),
}));
export const insertScannedSetSchema = createInsertSchema(scannedSets);
export const selectScannedSetSchema = createSelectSchema(scannedSets);

export const scannedSetFiles = sqliteTable("scanned_set_files", {
  id: text("id").primaryKey(),
  setId: text("set_id").notNull().references(() => scannedSets.id, { onDelete: 'cascade' }),
  relPath: text("rel_path").notNull(),
  path: text("path").notNull(),
  filename: text("filename").notNull(),
  size: integer("size", { mode: 'number' }).notNull(),
  sha1: text("sha1"),
  md5: text("md5"),
  crc32: text("crc32"),
  role: text("role").notNull().default("launch"),
  mtime: integer("mtime", { mode: 'number' }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  setIdIdx: index("scanned_set_files_set_id_idx").on(table.setId),
  pathIdx: index("scanned_set_files_path_idx").on(table.path),
}));
export const insertScannedSetFileSchema = createInsertSchema(scannedSetFiles);
export const selectScannedSetFileSchema = createSelectSchema(scannedSetFiles);

export const scannedFiles = sqliteTable("scanned_files", {
  id: text("id").primaryKey(),
  path: text("path").notNull().unique(),
  filename: text("filename").notNull(),
  size: integer("size", { mode: 'number' }).notNull(),
  ignored: integer("ignored", { mode: 'boolean' }).notNull().default(false),
  setId: text("set_id"),
  setType: text("set_type").default("single"),
  role: text("role").default("launch"),
  status: text("status").default("complete"),
  sha1: text("sha1"),
  md5: text("md5"),
  crc32: text("crc32"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  ignoredIdx: index("scanned_files_ignored_idx").on(table.ignored),
  setIdIdx: index("scanned_files_set_id_idx").on(table.setId),
}));
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
    platformIdIdx: index("game_platforms_platform_id_idx").on(table.platformId),
  };
});
export const insertGamePlatformSchema = createInsertSchema(gamePlatforms);
export const selectGamePlatformSchema = createSelectSchema(gamePlatforms);

export const fileTypeWhitelist = sqliteTable("file_type_whitelist", {
  id: text("id").primaryKey(),
  extension: text("extension").notNull(),
  magicNumber: text("magic_number"),
  description: text("description"),
  enabled: integer("enabled", { mode: 'boolean' }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
export const insertFileTypeWhitelistSchema = createInsertSchema(fileTypeWhitelist);
export const selectFileTypeWhitelistSchema = createSelectSchema(fileTypeWhitelist);

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  preset: text("preset").notNull().default("batocera"), // "batocera" | "esde" | "retropie"
  storageBudgetBytes: integer("storage_budget_bytes", { mode: 'number' }),
  lastSeenAt: text("last_seen_at"),
  lastSyncAt: text("last_sync_at"),
  agentVersion: text("agent_version"),
  lastReport: text("last_report"), // JSON string: counts, bytes, errors, free disk
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
export const insertDeviceSchema = createInsertSchema(devices);
export const selectDeviceSchema = createSelectSchema(devices);

export const deviceProfiles = sqliteTable("device_profiles", {
  deviceId: text("device_id").primaryKey().references(() => devices.id, { onDelete: 'cascade' }),
  regionPreference: text("region_preference").notNull().default("USA,EUR,JPN"),
  oneRomPerGame: integer("one_rom_per_game", { mode: 'boolean' }).notNull().default(false),
  includeFirmware: integer("include_firmware", { mode: 'boolean' }).notNull().default(true),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
export const insertDeviceProfileSchema = createInsertSchema(deviceProfiles);
export const selectDeviceProfileSchema = createSelectSchema(deviceProfiles);

export const profileRules = sqliteTable("profile_rules", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.id, { onDelete: 'cascade' }),
  position: integer("position", { mode: 'number' }).notNull().default(0),
  kind: text("kind").notNull(), // "include_system" | "exclude_system" | "include_game" | "exclude_game" | "include_rom" | "exclude_rom"
  targetId: text("target_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  deviceIdIdx: index("profile_rules_device_id_idx").on(table.deviceId),
}));
export const insertProfileRuleSchema = createInsertSchema(profileRules);
export const selectProfileRuleSchema = createSelectSchema(profileRules);

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(), // first 8 chars e.g. "rmg_7Fq2"
  keyHash: text("key_hash").notNull().unique(), // sha256 of full key
  scope: text("scope").notNull().default("device"), // "device" | "admin"
  deviceId: text("device_id").references(() => devices.id, { onDelete: 'cascade' }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  lastUsedAt: text("last_used_at"),
  revokedAt: text("revoked_at"),
}, (table) => ({
  prefixIdx: index("api_keys_prefix_idx").on(table.prefix),
  deviceIdIdx: index("api_keys_device_id_idx").on(table.deviceId),
}));
export const insertApiKeySchema = createInsertSchema(apiKeys);
export const selectApiKeySchema = createSelectSchema(apiKeys);


