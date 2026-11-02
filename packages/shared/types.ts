import { z } from "zod";
export { z };

export interface LibretroWasmCoreOption {
  id: string;
  name: string;
  systems: string;
  supportedSystems: string[];
}

const NES_SLUGS = ["nes", "nintendo-entertainment-system", "famicom", "fds", "family-computer", "family-computer-disk-system"];
const SNES_SLUGS = ["snes", "super-nintendo", "super-nintendo-entertainment-system", "sfc", "super-famicom"];
const GB_SLUGS = ["gb", "game-boy", "gbc", "game-boy-color"];
const GBA_SLUGS = ["gba", "game-boy-advance"];
const VB_SLUGS = ["virtualboy", "virtual-boy", "vb"];
const MD_SLUGS = ["megadrive", "genesis", "sega-genesis", "sega-mega-drive", "mega-drive"];
const SMS_SLUGS = ["mastersystem", "master-system", "sega-master-system", "sms"];
const GG_SLUGS = ["gamegear", "game-gear", "sega-game-gear", "gg"];
const SCD_SLUGS = ["segacd", "sega-cd", "mega-cd"];
const S32X_SLUGS = ["sega32x", "sega-32x", "32x"];
const SG1000_SLUGS = ["sg-1000", "sg1000"];
const PSX_SLUGS = ["psx", "ps1", "playstation", "sony-playstation", "playstation1", "playstation-1"];
const ARCADE_SLUGS = ["arcade", "fbneo", "fba", "mame", "cps1", "cps2", "cps3"];
const NEOGEO_SLUGS = ["neogeo", "neo-geo", "snk-neo-geo"];
const NEOCD_SLUGS = ["neogeocd", "neo-geo-cd"];
const NGP_SLUGS = ["ngp", "ngpc", "neo-geo-pocket", "neo-geo-pocket-color"];
const PCE_SLUGS = ["pcengine", "pc-engine", "tg16", "turbografx-16", "turbografx16", "pce", "pcenginecd", "pc-engine-cd", "tg-cd"];
const SGX_SLUGS = ["supergrafx", "sgx"];
const WS_SLUGS = ["wonderswan", "wonderswancolor", "wonderswan-color", "ws", "wsc"];
const LYNX_SLUGS = ["lynx", "atari-lynx"];
const COLECO_SLUGS = ["colecovision", "coleco"];
const ODYSSEY2_SLUGS = ["odyssey2", "magnavox-odyssey-2", "odyssey-2", "videopac"];
const THREEDO_SLUGS = ["3do", "panasonic-3do"];
const VECTREX_SLUGS = ["vectrex"];
const CHANNELF_SLUGS = ["channelf", "fairchild-channel-f", "channel-f"];
const C64_SLUGS = ["c64", "commodore-64"];
const C128_SLUGS = ["c128", "commodore-128"];
const VIC20_SLUGS = ["vic20", "vic-20", "commodore-vic-20"];

export const LIBRETRO_WASM_CORES: LibretroWasmCoreOption[] = [
  { id: "fceumm", name: "FCEUmm", systems: "NES / Famicom", supportedSystems: NES_SLUGS },
  { id: "nestopia", name: "Nestopia", systems: "NES / Famicom", supportedSystems: NES_SLUGS },
  { id: "quicknes", name: "QuickNES", systems: "NES / Famicom", supportedSystems: NES_SLUGS },
  { id: "snes9x", name: "Snes9x", systems: "Super Nintendo (SNES / SFC)", supportedSystems: SNES_SLUGS },
  { id: "snes9x2010", name: "Snes9x 2010", systems: "Super Nintendo (SNES / SFC)", supportedSystems: SNES_SLUGS },
  { id: "snes9x2005", name: "Snes9x 2005", systems: "Super Nintendo (SNES / SFC)", supportedSystems: SNES_SLUGS },
  { id: "snes9x2002", name: "Snes9x 2002", systems: "Super Nintendo (SNES / SFC)", supportedSystems: SNES_SLUGS },
  { id: "gambatte", name: "Gambatte", systems: "Game Boy / Game Boy Color", supportedSystems: GB_SLUGS },
  { id: "gearboy", name: "Gearboy", systems: "Game Boy / Game Boy Color", supportedSystems: GB_SLUGS },
  { id: "tgbdual", name: "TGB Dual", systems: "Game Boy / GBC (Link Cable)", supportedSystems: GB_SLUGS },
  { id: "mgba", name: "mGBA", systems: "Game Boy Advance / GB / GBC", supportedSystems: [...GBA_SLUGS, ...GB_SLUGS] },
  { id: "vba_next", name: "VBA Next", systems: "Game Boy Advance", supportedSystems: GBA_SLUGS },
  { id: "genesis_plus_gx", name: "Genesis Plus GX", systems: "Genesis / Mega Drive / Master System / Game Gear / Sega CD", supportedSystems: [...MD_SLUGS, ...SMS_SLUGS, ...GG_SLUGS, ...SCD_SLUGS, ...SG1000_SLUGS] },
  { id: "genesis_plus_gx_wide", name: "Genesis Plus GX Wide", systems: "Genesis / Mega Drive (Widescreen)", supportedSystems: MD_SLUGS },
  { id: "picodrive", name: "PicoDrive", systems: "Genesis / Mega Drive / Master System / Sega CD / 32X", supportedSystems: [...MD_SLUGS, ...SMS_SLUGS, ...SCD_SLUGS, ...S32X_SLUGS] },
  { id: "gearsystem", name: "Gearsystem", systems: "Master System / Game Gear / SG-1000", supportedSystems: [...SMS_SLUGS, ...GG_SLUGS, ...SG1000_SLUGS] },
  { id: "pcsx_rearmed", name: "PCSX ReARMed", systems: "Sony PlayStation (PS1 / PSX)", supportedSystems: PSX_SLUGS },
  { id: "fbneo", name: "FinalBurn Neo", systems: "Arcade / Neo Geo", supportedSystems: [...ARCADE_SLUGS, ...NEOGEO_SLUGS] },
  { id: "fbalpha2012", name: "FB Alpha 2012", systems: "Arcade", supportedSystems: [...ARCADE_SLUGS, ...NEOGEO_SLUGS] },
  { id: "fbalpha2012_neogeo", name: "FB Alpha 2012 Neo Geo", systems: "Neo Geo", supportedSystems: [...NEOGEO_SLUGS, ...ARCADE_SLUGS] },
  { id: "fbalpha2012_cps1", name: "FB Alpha 2012 CPS-1", systems: "Capcom CPS-1", supportedSystems: ARCADE_SLUGS },
  { id: "fbalpha2012_cps2", name: "FB Alpha 2012 CPS-2", systems: "Capcom CPS-2", supportedSystems: ARCADE_SLUGS },
  { id: "neocd", name: "NeoCD", systems: "Neo Geo CD", supportedSystems: NEOCD_SLUGS },
  { id: "mame2003_plus", name: "MAME 2003-Plus", systems: "Arcade (MAME 0.78+)", supportedSystems: ARCADE_SLUGS },
  { id: "mame2003", name: "MAME 2003", systems: "Arcade (MAME 0.78)", supportedSystems: ARCADE_SLUGS },
  { id: "mame2000", name: "MAME 2000", systems: "Arcade (MAME 0.37b5)", supportedSystems: ARCADE_SLUGS },
  { id: "mednafen_pce_fast", name: "Beetle PCE Fast", systems: "PC Engine / TurboGrafx-16", supportedSystems: PCE_SLUGS },
  { id: "geargrafx", name: "Geargrafx", systems: "PC Engine / TurboGrafx-16 / SuperGrafx", supportedSystems: [...PCE_SLUGS, ...SGX_SLUGS] },
  { id: "mednafen_ngp", name: "Beetle NeoPop", systems: "Neo Geo Pocket / Color", supportedSystems: NGP_SLUGS },
  { id: "mednafen_wswan", name: "Beetle WonderSwan", systems: "WonderSwan / Color", supportedSystems: WS_SLUGS },
  { id: "mednafen_vb", name: "Beetle VB", systems: "Virtual Boy", supportedSystems: VB_SLUGS },
  { id: "handy", name: "Handy", systems: "Atari Lynx", supportedSystems: LYNX_SLUGS },
  { id: "mednafen_lynx", name: "Beetle Lynx", systems: "Atari Lynx", supportedSystems: LYNX_SLUGS },
  { id: "gearcoleco", name: "Gearcoleco", systems: "ColecoVision", supportedSystems: COLECO_SLUGS },
  { id: "o2em", name: "O2EM", systems: "Magnavox Odyssey 2", supportedSystems: ODYSSEY2_SLUGS },
  { id: "opera", name: "Opera", systems: "3DO", supportedSystems: THREEDO_SLUGS },
  { id: "vecx", name: "VecX", systems: "Vectrex", supportedSystems: VECTREX_SLUGS },
  { id: "freechaf", name: "FreeChaF", systems: "Fairchild Channel F", supportedSystems: CHANNELF_SLUGS },
  { id: "vice_x64", name: "VICE x64", systems: "Commodore 64", supportedSystems: C64_SLUGS },
  { id: "vice_x128", name: "VICE x128", systems: "Commodore 128", supportedSystems: C128_SLUGS },
  { id: "vice_xvic", name: "VICE xvic", systems: "Commodore VIC-20", supportedSystems: VIC20_SLUGS },
];

const DEFAULT_SYSTEM_CORES: Record<string, string> = {
  // Nintendo
  "nes": "fceumm",
  "nintendo-entertainment-system": "fceumm",
  "entertainment-system": "fceumm",
  "famicom": "fceumm",
  "family-computer": "fceumm",
  "fds": "fceumm",
  "family-computer-disk-system": "fceumm",
  "snes": "snes9x",
  "super-nintendo": "snes9x",
  "super-nintendo-entertainment-system": "snes9x",
  "sfc": "snes9x",
  "super-famicom": "snes9x",
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
  "sony-playstation": "pcsx_rearmed",
  "playstation1": "pcsx_rearmed",
  "playstation-1": "pcsx_rearmed",

  // Arcade & SNK
  "arcade": "fbneo",
  "fbneo": "fbneo",
  "fba": "fbalpha2012",
  "mame": "mame2003_plus",
  "cps1": "fbalpha2012_cps1",
  "cps2": "fbalpha2012_cps2",
  "cps3": "fbneo",
  "neogeo": "fbneo",
  "neo-geo": "fbneo",
  "snk-neo-geo": "fbneo",
  "neogeocd": "neocd",
  "neo-geo-cd": "neocd",
  "ngp": "mednafen_ngp",
  "ngpc": "mednafen_ngp",
  "neo-geo-pocket": "mednafen_ngp",
  "neo-geo-pocket-color": "mednafen_ngp",

  // NEC / Bandai / Atari / Others
  "pcengine": "mednafen_pce_fast",
  "pc-engine": "mednafen_pce_fast",
  "pce": "mednafen_pce_fast",
  "pcenginecd": "mednafen_pce_fast",
  "pc-engine-cd": "mednafen_pce_fast",
  "tg-cd": "mednafen_pce_fast",
  "tg16": "mednafen_pce_fast",
  "turbografx-16": "mednafen_pce_fast",
  "turbografx16": "mednafen_pce_fast",
  "supergrafx": "geargrafx",
  "sgx": "geargrafx",
  "wonderswan": "mednafen_wswan",
  "wonderswancolor": "mednafen_wswan",
  "wonderswan-color": "mednafen_wswan",
  "ws": "mednafen_wswan",
  "wsc": "mednafen_wswan",
  "lynx": "handy",
  "atari-lynx": "handy",
  "colecovision": "gearcoleco",
  "coleco": "gearcoleco",
  "odyssey2": "o2em",
  "odyssey-2": "o2em",
  "magnavox-odyssey-2": "o2em",
  "videopac": "o2em",
  "3do": "opera",
  "panasonic-3do": "opera",
  "vectrex": "vecx",
  "channelf": "freechaf",
  "channel-f": "freechaf",
  "fairchild-channel-f": "freechaf",
  "c64": "vice_x64",
  "commodore-64": "vice_x64",
  "c128": "vice_x128",
  "commodore-128": "vice_x128",
  "vic20": "vice_xvic",
  "vic-20": "vice_xvic",
  "commodore-vic-20": "vice_xvic",
};

const VENDOR_PREFIX_RE = /^(sony|nintendo|sega|atari|nec|bandai|snk|commodore|magnavox|fairchild|panasonic|mattel|capcom)-/;

function normalizePlatformCandidates(
  slugOrName?: string | null,
  esFolder?: string | null
): string[] {
  const raw = [esFolder, slugOrName]
    .filter((v): v is string => Boolean(v))
    .map((v) =>
      v
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    )
    .filter(Boolean);

  const expanded: string[] = [];
  for (const item of raw) {
    expanded.push(item);
    // Strip trailing test suffixes like "snes-test-12345" or "nes-12345" only when preceded by a known key
    const strippedVendor = item.replace(VENDOR_PREFIX_RE, "");
    if (strippedVendor && strippedVendor !== item) {
      expanded.push(strippedVendor);
    }
    const withoutTestSuffix = item.replace(/-(test-)?\d{6,}$/, "");
    if (withoutTestSuffix && withoutTestSuffix !== item) {
      expanded.push(withoutTestSuffix);
    }
  }
  return Array.from(new Set(expanded));
}

export function getCoresForPlatform(
  slugOrName?: string | null,
  esFolder?: string | null
): LibretroWasmCoreOption[] {
  const candidates = normalizePlatformCandidates(slugOrName, esFolder);
  if (candidates.length === 0) return [];

  return LIBRETRO_WASM_CORES.filter((core) =>
    core.supportedSystems.some((sys) => candidates.includes(sys))
  );
}

export function getDefaultEmulatorConfig(
  slugOrName?: string | null,
  esFolder?: string | null
): { emulatable: boolean; emulatorCore: string | null } {
  const candidates = normalizePlatformCandidates(slugOrName, esFolder);

  for (const candidate of candidates) {
    if (DEFAULT_SYSTEM_CORES[candidate]) {
      return { emulatable: true, emulatorCore: DEFAULT_SYSTEM_CORES[candidate] };
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


