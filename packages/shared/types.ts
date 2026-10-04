import { z } from "zod";

export const PlatformSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  path: z.string().nullable().optional(),
  esFolder: z.string().nullable().optional(),
});
export type Platform = z.infer<typeof PlatformSchema>;

export const SystemFirmwareSchema = z.object({
  id: z.string(),
  systemId: z.string(),
  filename: z.string(),
  description: z.string().optional().nullable(),
  path: z.string(),
  md5: z.string().optional().nullable(),
  crc32: z.string().optional().nullable(),
  sha1: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type SystemFirmware = z.infer<typeof SystemFirmwareSchema>;

export const RomFileRoleSchema = z.enum(["launch", "track", "disc", "descriptor", "aux"]);
export type RomFileRole = z.infer<typeof RomFileRoleSchema>;

export const RomSetTypeSchema = z.enum(["single", "cue", "gdi", "m3u", "directory"]);
export type RomSetType = z.infer<typeof RomSetTypeSchema>;

export const RomFileSchema = z.object({
  id: z.string(),
  romId: z.string().optional(),
  relPath: z.string(),
  path: z.string(),
  filename: z.string().optional(),
  size: z.number(),
  sha1: z.string().optional().nullable(),
  md5: z.string().optional().nullable(),
  crc32: z.string().optional().nullable(),
  role: RomFileRoleSchema.default("launch"),
  mtime: z.number().optional().nullable(),
  createdAt: z.string().optional(),
});
export type RomFile = z.infer<typeof RomFileSchema>;

export const RomSchema = z.object({
  id: z.string(),
  gameId: z.string().optional(),
  systemId: z.string(),
  name: z.string().optional().nullable(),
  setType: RomSetTypeSchema.default("single"),
  basePath: z.string().optional().nullable(),
  launchFile: z.string().optional(),
  filename: z.string(),
  path: z.string().optional().nullable(),
  size: z.number(),
  totalSize: z.number().optional(),
  setHash: z.string().optional().nullable(),
  status: z.enum(["complete", "incomplete"]).default("complete"),
  region: z.string().optional().nullable(),
  crc32: z.string().optional().nullable(),
  md5: z.string().optional().nullable(),
  sha1: z.string().optional().nullable(),
  platform: z.string().optional(), // Deprecated in GameRead responses
  pendingDelete: z.boolean().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  files: z.array(RomFileSchema).optional(),
});
export type Rom = z.infer<typeof RomSchema>;

export const PlatformReadSchema = PlatformSchema.extend({
  firmware: z.array(SystemFirmwareSchema).optional(),
  romCount: z.number().optional(),
  roms: z.array(RomSchema).optional(),
});
export type PlatformRead = z.infer<typeof PlatformReadSchema>;

// Unified aliases for backward compatibility
export const SystemSchema = PlatformSchema;
export type System = Platform;
export const SystemReadSchema = PlatformReadSchema;
export type SystemRead = PlatformRead;

export const GameSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  backgroundImage: z.string().optional().nullable(),
  released: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  platforms: z.array(PlatformSchema).optional(),
});
export type Game = z.infer<typeof GameSchema>;

export const GameReadSchema = GameSchema.extend({
  platforms: z.array(PlatformReadSchema).optional(),
});
export type GameRead = z.infer<typeof GameReadSchema>;

export interface ScanProgress {
    count: number;
    currentFile: string;
}

export interface SystemScanUpdate {
    systemName: string;
    gameCount: number;
}

export type WorkerMessage = 
  | { type: 'start' }
  | { type: 'progress'; count: number; currentFile: string }
  | { type: 'done'; count: number }
  | { type: 'error'; message: string };

export interface Config {
  romsDir: string;
  webdavPort: number;
  apiPort: number;
}

export const FileTypeWhitelistSchema = z.object({
  id: z.string(),
  extension: z.string(),
  magicNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  createdAt: z.string().optional(),
});
export type FileTypeWhitelist = z.infer<typeof FileTypeWhitelistSchema>;

