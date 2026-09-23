import { z } from "zod";

export const SystemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  path: z.string().nullable(),
});
export type System = z.infer<typeof SystemSchema>;

export const SystemFirmwareSchema = z.object({
  id: z.string(),
  systemId: z.string(),
  filename: z.string(),
  description: z.string().optional().nullable(),
  path: z.string(),
  md5: z.string().optional().nullable(),
  crc32: z.string().optional().nullable(),
  createdAt: z.string().optional(),
});
export type SystemFirmware = z.infer<typeof SystemFirmwareSchema>;

export const SystemReadSchema = SystemSchema.extend({
    firmware: z.array(SystemFirmwareSchema).optional()
});
export type SystemRead = z.infer<typeof SystemReadSchema>;

export const PlatformSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
});
export type Platform = z.infer<typeof PlatformSchema>;

export const RomSchema = z.object({
  id: z.string(),
  gameId: z.string().optional(),
  systemId: z.string(),
  filename: z.string(),
  path: z.string(),
  size: z.number(),
  region: z.string().optional().nullable(),
  crc32: z.string().optional().nullable(),
  md5: z.string().optional().nullable(),
  platform: z.string().optional(), // Deprecated in GameRead responses
  pendingDelete: z.boolean().optional().nullable(),
});
export type Rom = z.infer<typeof RomSchema>;

export const PlatformReadSchema = PlatformSchema.extend({
    roms: z.array(RomSchema).optional()
});
export type PlatformRead = z.infer<typeof PlatformReadSchema>;

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

