import { z } from "zod";
export { z };

export interface LibretroWasmCoreOption {
  id: string;
  name: string;
  systems: string;
}

export const LIBRETRO_WASM_CORES: LibretroWasmCoreOption[] = [
  { id: "fceumm", name: "FCEUmm", systems: "NES / Famicom" },
  { id: "nestopia", name: "Nestopia", systems: "NES / Famicom" },
  { id: "quicknes", name: "QuickNES", systems: "NES / Famicom" },
  { id: "snes9x", name: "Snes9x", systems: "Super Nintendo (SNES / SFC)" },
  { id: "snes9x2010", name: "Snes9x 2010", systems: "Super Nintendo (SNES / SFC)" },
  { id: "snes9x2005", name: "Snes9x 2005", systems: "Super Nintendo (SNES / SFC)" },
  { id: "snes9x2002", name: "Snes9x 2002", systems: "Super Nintendo (SNES / SFC)" },
  { id: "gambatte", name: "Gambatte", systems: "Game Boy / Game Boy Color" },
  { id: "gearboy", name: "Gearboy", systems: "Game Boy / Game Boy Color" },
  { id: "tgbdual", name: "TGB Dual", systems: "Game Boy / GBC (Link Cable)" },
  { id: "mgba", name: "mGBA", systems: "Game Boy Advance / GB / GBC" },
  { id: "vba_next", name: "VBA Next", systems: "Game Boy Advance" },
  { id: "genesis_plus_gx", name: "Genesis Plus GX", systems: "Genesis / Mega Drive / Master System / Game Gear / Sega CD" },
  { id: "genesis_plus_gx_wide", name: "Genesis Plus GX Wide", systems: "Genesis / Mega Drive (Widescreen)" },
  { id: "picodrive", name: "PicoDrive", systems: "Genesis / Mega Drive / Master System / Sega CD / 32X" },
  { id: "gearsystem", name: "Gearsystem", systems: "Master System / Game Gear / SG-1000" },
  { id: "pcsx_rearmed", name: "PCSX ReARMed", systems: "Sony PlayStation (PS1 / PSX)" },
  { id: "fbneo", name: "FinalBurn Neo", systems: "Arcade / Neo Geo" },
  { id: "fbalpha2012", name: "FB Alpha 2012", systems: "Arcade" },
  { id: "fbalpha2012_neogeo", name: "FB Alpha 2012 Neo Geo", systems: "Neo Geo" },
  { id: "fbalpha2012_cps1", name: "FB Alpha 2012 CPS-1", systems: "Capcom CPS-1" },
  { id: "fbalpha2012_cps2", name: "FB Alpha 2012 CPS-2", systems: "Capcom CPS-2" },
  { id: "neocd", name: "NeoCD", systems: "Neo Geo CD" },
  { id: "mame2003_plus", name: "MAME 2003-Plus", systems: "Arcade (MAME 0.78+)" },
  { id: "mame2003", name: "MAME 2003", systems: "Arcade (MAME 0.78)" },
  { id: "mame2000", name: "MAME 2000", systems: "Arcade (MAME 0.37b5)" },
  { id: "mednafen_pce_fast", name: "Beetle PCE Fast", systems: "PC Engine / TurboGrafx-16" },
  { id: "geargrafx", name: "Geargrafx", systems: "PC Engine / TurboGrafx-16 / SuperGrafx" },
  { id: "mednafen_ngp", name: "Beetle NeoPop", systems: "Neo Geo Pocket / Color" },
  { id: "mednafen_wswan", name: "Beetle WonderSwan", systems: "WonderSwan / Color" },
  { id: "mednafen_vb", name: "Beetle VB", systems: "Virtual Boy" },
  { id: "handy", name: "Handy", systems: "Atari Lynx" },
  { id: "mednafen_lynx", name: "Beetle Lynx", systems: "Atari Lynx" },
  { id: "gearcoleco", name: "Gearcoleco", systems: "ColecoVision" },
  { id: "o2em", name: "O2EM", systems: "Magnavox Odyssey 2" },
  { id: "opera", name: "Opera", systems: "3DO" },
  { id: "vecx", name: "VecX", systems: "Vectrex" },
  { id: "freechaf", name: "FreeChaF", systems: "Fairchild Channel F" },
  { id: "vice_x64", name: "VICE x64", systems: "Commodore 64" },
  { id: "vice_x128", name: "VICE x128", systems: "Commodore 128" },
  { id: "vice_xvic", name: "VICE xvic", systems: "Commodore VIC-20" },
];

const DEFAULT_SYSTEM_CORES: Record<string, string> = {
  // Nintendo
  "nes": "fceumm",
  "nintendo-entertainment-system": "fceumm",
  "famicom": "fceumm",
  "fds": "fceumm",
  "snes": "snes9x",
  "super-nintendo": "snes9x",
  "super-nintendo-entertainment-system": "snes9x",
  "sfc": "snes9x",
  "gb": "gambatte",
  "game-boy": "gambatte",
  "gbc": "gambatte",
  "game-boy-color": "gambatte",
  "gba": "mgba",
  "game-boy-advance": "mgba",
  "virtualboy": "mednafen_vb",
  "virtual-boy": "mednafen_vb",
  "vb": "mednafen_vb",

  // Sega
  "megadrive": "genesis_plus_gx",
  "genesis": "genesis_plus_gx",
  "sega-genesis": "genesis_plus_gx",
  "sega-mega-drive": "genesis_plus_gx",
  "mega-drive": "genesis_plus_gx",
  "mastersystem": "genesis_plus_gx",
  "master-system": "genesis_plus_gx",
  "sega-master-system": "genesis_plus_gx",
  "sms": "genesis_plus_gx",
  "gamegear": "genesis_plus_gx",
  "game-gear": "genesis_plus_gx",
  "sega-game-gear": "genesis_plus_gx",
  "gg": "genesis_plus_gx",
  "segacd": "genesis_plus_gx",
  "sega-cd": "genesis_plus_gx",
  "mega-cd": "genesis_plus_gx",
  "sega32x": "picodrive",
  "sega-32x": "picodrive",
  "32x": "picodrive",
  "sg-1000": "gearsystem",
  "sg1000": "gearsystem",

  // Sony
  "psx": "pcsx_rearmed",
  "ps1": "pcsx_rearmed",
  "playstation": "pcsx_rearmed",
  "playstation1": "pcsx_rearmed",
  "playstation-1": "pcsx_rearmed",

  // Arcade & SNK
  "arcade": "fbneo",
  "fbneo": "fbneo",
  "fba": "fbalpha2012",
  "mame": "mame2003_plus",
  "neogeo": "fbneo",
  "neo-geo": "fbneo",
  "neogeocd": "neocd",
  "neo-geo-cd": "neocd",
  "ngp": "mednafen_ngp",
  "ngpc": "mednafen_ngp",
  "neo-geo-pocket": "mednafen_ngp",
  "neo-geo-pocket-color": "mednafen_ngp",

  // NEC / Bandai / Atari / Others
  "pcengine": "mednafen_pce_fast",
  "pc-engine": "mednafen_pce_fast",
  "tg16": "mednafen_pce_fast",
  "turbografx-16": "mednafen_pce_fast",
  "supergrafx": "geargrafx",
  "wonderswan": "mednafen_wswan",
  "wonderswancolor": "mednafen_wswan",
  "wonderswan-color": "mednafen_wswan",
  "lynx": "handy",
  "atari-lynx": "handy",
  "colecovision": "gearcoleco",
  "odyssey2": "o2em",
  "3do": "opera",
  "vectrex": "vecx",
  "channelf": "freechaf",
  "c64": "vice_x64",
  "commodore-64": "vice_x64",
};

export function getDefaultEmulatorConfig(
  slugOrName?: string | null,
  esFolder?: string | null
): { emulatable: boolean; emulatorCore: string | null } {
  const candidates = [esFolder, slugOrName]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase().trim().replace(/[_\s]+/g, "-"));

  for (const candidate of candidates) {
    if (DEFAULT_SYSTEM_CORES[candidate]) {
      return { emulatable: true, emulatorCore: DEFAULT_SYSTEM_CORES[candidate] };
    }
  }

  for (const candidate of candidates) {
    for (const [key, core] of Object.entries(DEFAULT_SYSTEM_CORES)) {
      if (candidate === key || (key.length >= 3 && candidate.split("-").includes(key))) {
        return { emulatable: true, emulatorCore: core };
      }
    }
  }

  return { emulatable: false, emulatorCore: null };
}

export const PlatformSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  path: z.string().nullable().optional(),
  esFolder: z.string().nullable().optional(),
  emulatable: z.boolean().optional(),
  emulatorCore: z.string().nullable().optional(),
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
  emulatable: z.boolean().optional(),
  emulatorCore: z.string().nullable().optional(),
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

export const ManifestFileSchema = z.object({
  id: z.string(),                  // rom_files.id or firmware id; used with /api/sync/files/:id
  path: z.string(),                // device-relative POSIX path from the ROM root (or BIOS root for firmware)
  size: z.number(),
  sha1: z.string(),
  role: z.enum(["launch", "track", "disc", "descriptor", "aux"]),
});
export type ManifestFile = z.infer<typeof ManifestFileSchema>;

export const ManifestSetSchema = z.object({
  kind: z.enum(["rom", "firmware"]),
  id: z.string(),                  // roms.id / firmware id
  gameId: z.string().nullable(),
  systemId: z.string(),
  esFolder: z.string(),
  name: z.string(),
  setType: z.enum(["single", "cue", "gdi", "m3u", "directory"]),
  launchPath: z.string(),          // device-relative path ES will show
  setHash: z.string(),
  totalSize: z.number(),
  files: z.array(ManifestFileSchema).min(1),
  requires: z.array(z.string()).default([]),
  implicit: z.boolean().default(false),
});
export type ManifestSet = z.infer<typeof ManifestSetSchema>;

export const ManifestSchema = z.object({
  deviceId: z.string(),
  version: z.string(),
  generatedAt: z.string(),
  overBudget: z.boolean(),
  totalBytes: z.number(),
  sets: z.array(ManifestSetSchema),
  warnings: z.array(z.string()),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export const DevicePresetSchema = z.enum(["batocera", "esde", "retropie"]);
export type DevicePreset = z.infer<typeof DevicePresetSchema>;

export const ProfileRuleKindSchema = z.enum([
  "include_system",
  "exclude_system",
  "include_game",
  "exclude_game",
  "include_rom",
  "exclude_rom",
]);
export type ProfileRuleKind = z.infer<typeof ProfileRuleKindSchema>;

export const ProfileRuleSchema = z.object({
  id: z.string().optional(),
  deviceId: z.string().optional(),
  position: z.number().default(0),
  kind: ProfileRuleKindSchema,
  targetId: z.string(),
  createdAt: z.string().optional(),
});
export type ProfileRule = z.infer<typeof ProfileRuleSchema>;

export const DeviceProfileSchema = z.object({
  deviceId: z.string().optional(),
  regionPreference: z.string().default("USA,EUR,JPN"),
  oneRomPerGame: z.boolean().default(false),
  includeFirmware: z.boolean().default(true),
  updatedAt: z.string().optional(),
  rules: z.array(ProfileRuleSchema).optional(),
});
export type DeviceProfile = z.infer<typeof DeviceProfileSchema>;

export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  preset: DevicePresetSchema.default("batocera"),
  storageBudgetBytes: z.number().nullable().optional(),
  lastSeenAt: z.string().nullable().optional(),
  lastSyncAt: z.string().nullable().optional(),
  agentVersion: z.string().nullable().optional(),
  lastReport: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  profile: DeviceProfileSchema.optional(),
});
export type Device = z.infer<typeof DeviceSchema>;


