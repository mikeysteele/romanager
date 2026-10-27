import { getDatabaseDialect } from "./dialect.ts";
import * as sqliteSchema from "./schema.sqlite.ts";
import * as pgSchema from "./schema.pg.ts";

const dialect = getDatabaseDialect();
const activeSchema = (dialect === "postgres" ? pgSchema : sqliteSchema) as typeof sqliteSchema;

// Export active schema tables and zod schemas
export const systems = activeSchema.systems;
export const insertSystemSchema = activeSchema.insertSystemSchema;
export const selectSystemSchema = activeSchema.selectSystemSchema;

export const systemFirmware = activeSchema.systemFirmware;
export const insertSystemFirmwareSchema = activeSchema.insertSystemFirmwareSchema;
export const selectSystemFirmwareSchema = activeSchema.selectSystemFirmwareSchema;

export const games = activeSchema.games;
export const insertGameSchema = activeSchema.insertGameSchema;
export const selectGameSchema = activeSchema.selectGameSchema;

export const roms = activeSchema.roms;
export const insertRomSchema = activeSchema.insertRomSchema;
export const selectRomSchema = activeSchema.selectRomSchema;

export const romFiles = activeSchema.romFiles;
export const insertRomFileSchema = activeSchema.insertRomFileSchema;
export const selectRomFileSchema = activeSchema.selectRomFileSchema;

export const settings = activeSchema.settings;
export const insertSettingSchema = activeSchema.insertSettingSchema;
export const selectSettingSchema = activeSchema.selectSettingSchema;

export const scannedSets = activeSchema.scannedSets;
export const insertScannedSetSchema = activeSchema.insertScannedSetSchema;
export const selectScannedSetSchema = activeSchema.selectScannedSetSchema;

export const scannedSetFiles = activeSchema.scannedSetFiles;
export const insertScannedSetFileSchema = activeSchema.insertScannedSetFileSchema;
export const selectScannedSetFileSchema = activeSchema.selectScannedSetFileSchema;

export const scannedFiles = activeSchema.scannedFiles;
export const insertScannedFileSchema = activeSchema.insertScannedFileSchema;
export const selectScannedFileSchema = activeSchema.selectScannedFileSchema;

export const platforms = activeSchema.platforms;
export const insertPlatformSchema = activeSchema.insertPlatformSchema;
export const selectPlatformSchema = activeSchema.selectPlatformSchema;

export const gamePlatforms = activeSchema.gamePlatforms;
export const insertGamePlatformSchema = activeSchema.insertGamePlatformSchema;
export const selectGamePlatformSchema = activeSchema.selectGamePlatformSchema;

export const fileTypeWhitelist = activeSchema.fileTypeWhitelist;
export const insertFileTypeWhitelistSchema = activeSchema.insertFileTypeWhitelistSchema;
export const selectFileTypeWhitelistSchema = activeSchema.selectFileTypeWhitelistSchema;

export const devices = activeSchema.devices;
export const insertDeviceSchema = activeSchema.insertDeviceSchema;
export const selectDeviceSchema = activeSchema.selectDeviceSchema;

export const deviceProfiles = activeSchema.deviceProfiles;
export const insertDeviceProfileSchema = activeSchema.insertDeviceProfileSchema;
export const selectDeviceProfileSchema = activeSchema.selectDeviceProfileSchema;

export const profileRules = activeSchema.profileRules;
export const insertProfileRuleSchema = activeSchema.insertProfileRuleSchema;
export const selectProfileRuleSchema = activeSchema.selectProfileRuleSchema;

export const apiKeys = activeSchema.apiKeys;
export const insertApiKeySchema = activeSchema.insertApiKeySchema;
export const selectApiKeySchema = activeSchema.selectApiKeySchema;

export const saveFiles = activeSchema.saveFiles;
export const insertSaveFileSchema = activeSchema.insertSaveFileSchema;
export const selectSaveFileSchema = activeSchema.selectSaveFileSchema;

export const saveVersions = activeSchema.saveVersions;
export const insertSaveVersionSchema = activeSchema.insertSaveVersionSchema;
export const selectSaveVersionSchema = activeSchema.selectSaveVersionSchema;

export { sqliteSchema, pgSchema };
