import { db } from "./index.ts";
import { games, roms, romFiles, systems, settings, platforms, gamePlatforms, systemFirmware, systemFirmwareFiles, fileTypeWhitelist } from "./schema.ts";
import { eq, like, inArray, and, or, sql } from "drizzle-orm";
import { match, P } from "ts-pattern";
import { slugify } from "../utils.ts";
import { getDefaultEsFolder, getDefaultEmulatorConfig, getCoresForPlatform } from "../platform-mappings.ts";

// Define a generic transaction type compatible across both SQLite and Postgres
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

export interface SystemEmulationOverrides {
  emulatable?: boolean;
  emulatorCore?: string | null;
}

function resolveTxAndOverrides(
  txOrOverrides: Tx | SystemEmulationOverrides,
  maybeTx: Tx
): { tx: Tx; overrides: SystemEmulationOverrides } {
  return match(txOrOverrides)
    .with({ select: P.any }, (tx) => ({ tx, overrides: {} }))
    .with(P.nonNullable, (overrides) => ({
      tx: maybeTx,
      overrides: overrides as SystemEmulationOverrides,
    }))
    .otherwise(() => ({ tx: maybeTx, overrides: {} }));
}

export function resolveEmulationState(
  slugOrName: string | null | undefined,
  folderOrPath: string | null | undefined,
  current: { emulatable?: boolean | null; emulatorCore?: string | null } = {},
  overrides: SystemEmulationOverrides = {}
): { emulatable: boolean; emulatorCore: string | null } {
  const availableCores = getCoresForPlatform(slugOrName, folderOrPath);
  if (availableCores.length === 0) {
    return { emulatable: false, emulatorCore: null };
  }

  const defaults = getDefaultEmulatorConfig(slugOrName, folderOrPath);
  const defaultCore = defaults.emulatorCore || availableCores[0].id;
  const isSupportedCore = (core: string | null | undefined): core is string =>
    Boolean(core && availableCores.some((c) => c.id === core));

  const emulatorCore = match({
    overrideCore: overrides.emulatorCore,
    currentCore: current.emulatorCore,
  })
    .with({ overrideCore: P.when(isSupportedCore) }, ({ overrideCore }) => overrideCore)
    .with({ overrideCore: P.not(undefined) }, () => defaultCore)
    .with({ currentCore: P.when(isSupportedCore) }, ({ currentCore }) => currentCore)
    .otherwise(() => defaultCore);

  const emulatable = match({
    overrideEmulatable: overrides.emulatable,
    currentEmulatable: current.emulatable,
    hadCoreConfigured: current.emulatorCore !== null && current.emulatorCore !== undefined,
  })
    .with({ overrideEmulatable: P.boolean }, ({ overrideEmulatable }) => overrideEmulatable)
    .with({ hadCoreConfigured: true, currentEmulatable: P.boolean }, ({ currentEmulatable }) => currentEmulatable)
    .otherwise(() => defaults.emulatable);

  return { emulatable, emulatorCore };
}

function groupByKey<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export async function findOrCreateSystem(
  name: string,
  path: string | null = null,
  esFolder: string | null = null,
  txOrOverrides: Tx | SystemEmulationOverrides = db as unknown as Tx,
  maybeTx: Tx = db as unknown as Tx
) {
  const { tx, overrides } = resolveTxAndOverrides(txOrOverrides, maybeTx);
  const existingRows = await tx.select().from(systems).where(eq(systems.name, name));

  if (existingRows.length > 0) {
    const sys = existingRows[0];
    const folder = sys.esFolder || esFolder || getDefaultEsFolder(sys.slug);
    const { emulatable, emulatorCore } = resolveEmulationState(
      sys.slug || sys.name,
      esFolder || folder || sys.path,
      sys,
      overrides
    );

    const updates: Partial<typeof systems.$inferInsert> = {
      ...(folder && !sys.esFolder ? { esFolder: folder } : {}),
      ...(emulatable !== sys.emulatable ? { emulatable } : {}),
      ...(emulatorCore !== sys.emulatorCore ? { emulatorCore } : {}),
    };

    if (Object.keys(updates).length > 0) {
      await tx.update(systems).set(updates).where(eq(systems.id, sys.id));
    }

    return { ...sys, ...updates };
  }

  const slug = slugify(name);
  const id = crypto.randomUUID();
  const folder = esFolder || getDefaultEsFolder(slug);
  const { emulatable, emulatorCore } = resolveEmulationState(
    slug || name,
    folder || path,
    {},
    overrides
  );

  const result = await tx
    .insert(systems)
    .values({ id, name, slug, path, esFolder: folder, emulatable, emulatorCore })
    .returning();
  return result[0];
}

export async function findOrCreateGame(title: string, tx: Tx = db as unknown as Tx) {
  const slug = slugify(title);
  const existing = await tx.select().from(games).where(eq(games.slug, slug));
  if (existing.length > 0) return existing[0];

  const id = crypto.randomUUID();
  const result = await tx
    .insert(games)
    .values({
      id,
      name: title,
      slug,
      // Description, released, etc. populated later via metadata fetch
    })
    .returning();
  return result[0];
}

export async function getGames(limit?: number, offset?: number) {
  const baseQuery = db.select().from(games).orderBy(games.name);
  const validLimit = limit && limit > 0 ? limit : undefined;
  const validOffset = offset && offset > 0 ? offset : undefined;

  return await match({ limit: validLimit, offset: validOffset })
    .with({ limit: P.number, offset: P.number }, ({ limit: l, offset: o }) =>
      baseQuery.limit(l).offset(o)
    )
    .with({ limit: P.number }, ({ limit: l }) => baseQuery.limit(l))
    .otherwise(() => baseQuery);
}

export async function searchLocalGames(query: string) {
  const matchedGames = await db
    .select()
    .from(games)
    .where(like(games.name, `%${query}%`))
    .orderBy(games.name);

  if (matchedGames.length === 0) return [];

  const gameIds = matchedGames.map((g) => g.id);

  // Fetch all platforms for these matched games
  const gamePlats = await db
    .select({
      gameId: gamePlatforms.gameId,
      id: platforms.id,
      name: platforms.name,
      slug: platforms.slug,
    })
    .from(gamePlatforms)
    .innerJoin(platforms, eq(gamePlatforms.platformId, platforms.id))
    .where(inArray(gamePlatforms.gameId, gameIds));

  // Map platforms to correct game
  return matchedGames.map((game) => ({
    ...game,
    platforms: gamePlats
      .filter((p) => p.gameId === game.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      })),
  }));
}

type EnrichedRom = typeof roms.$inferSelect & {
  files: (typeof romFiles.$inferSelect)[];
  emulatable: boolean;
  emulatorCore: string | null;
};

function mergeUniqueRoms(existingRoms: EnrichedRom[], incomingRoms: EnrichedRom[]): EnrichedRom[] {
  const seenRomIds = new Set(existingRoms.map((r) => r.id));
  const uniqueIncoming = incomingRoms.filter((rom) => !seenRomIds.has(rom.id));
  return [...existingRoms, ...uniqueIncoming];
}

async function enrichGameWithPlatformsAndRoms(game: typeof games.$inferSelect) {
  // Fetch all platforms for the game
  const gamePlats = await db
    .select({
      id: platforms.id,
      name: platforms.name,
      slug: platforms.slug,
    })
    .from(gamePlatforms)
    .innerJoin(platforms, eq(gamePlatforms.platformId, platforms.id))
    .where(eq(gamePlatforms.gameId, game.id));

  // Fetch associated ROMs with system metadata
  const rawRoms = await db
    .select({
      rom: roms,
      systemName: systems.name,
      systemSlug: systems.slug,
      systemEsFolder: systems.esFolder,
      systemEmulatable: systems.emulatable,
      systemEmulatorCore: systems.emulatorCore,
    })
    .from(roms)
    .leftJoin(systems, eq(roms.systemId, systems.id))
    .where(and(eq(roms.gameId, game.id), eq(roms.pendingDelete, false)));

  const rawRomIds = rawRoms.map((r) => r.rom.id);
  const allRomFiles =
    rawRomIds.length > 0
      ? await db.select().from(romFiles).where(inArray(romFiles.romId, rawRomIds))
      : [];
  const romFilesMap = groupByKey(allRomFiles, (rf) => rf.romId);

  const uniquePlatformsMap = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      emulatable: boolean;
      emulatorCore: string | null;
      roms: EnrichedRom[];
    }
  >();

  for (const plat of gamePlats) {
    const platKey = plat.name.toLowerCase().trim();
    const matchingRawRoms = rawRoms.filter((r) => {
      if (r.rom.systemId === plat.id) return true;
      const sysName = r.systemName?.toLowerCase().trim();
      return Boolean(
        sysName &&
          platKey &&
          (sysName === platKey || sysName.includes(platKey) || platKey.includes(sysName))
      );
    });

    const platformRoms: EnrichedRom[] = matchingRawRoms.map((r) => {
      const { emulatable, emulatorCore } = resolveEmulationState(
        r.systemSlug || r.systemName || plat.slug,
        r.systemEsFolder,
        { emulatable: r.systemEmulatable, emulatorCore: r.systemEmulatorCore }
      );
      return {
        ...r.rom,
        emulatable,
        emulatorCore,
        files: romFilesMap.get(r.rom.id) || [],
      };
    });

    const firstRom = platformRoms[0];
    const fallbackState = resolveEmulationState(plat.slug || plat.name, null);
    const platEmulatable = firstRom ? firstRom.emulatable : fallbackState.emulatable;
    const platCore = firstRom ? firstRom.emulatorCore : fallbackState.emulatorCore;
    const existing = uniquePlatformsMap.get(platKey);

    const nextPlatformEntry = existing
      ? {
          ...existing,
          emulatable: firstRom ? firstRom.emulatable : existing.emulatable,
          emulatorCore: firstRom ? firstRom.emulatorCore : existing.emulatorCore,
          roms: mergeUniqueRoms(existing.roms, platformRoms),
        }
      : {
          ...plat,
          emulatable: platEmulatable,
          emulatorCore: platCore,
          roms: platformRoms,
        };

    uniquePlatformsMap.set(platKey, nextPlatformEntry);
  }

  return { ...game, platforms: Array.from(uniquePlatformsMap.values()) };
}

export async function getGameById(id: string) {
  const game = await db.select().from(games).where(eq(games.id, id)).get();
  if (!game) return null;
  return enrichGameWithPlatformsAndRoms(game);
}

export async function getGameBySlug(slug: string) {
  const game = await db.select().from(games).where(eq(games.slug, slug)).get();
  if (!game) return null;
  return enrichGameWithPlatformsAndRoms(game);
}

export async function deleteGameFromDb(id: string) {
  // 1. Get associated ROM paths before deletion from both roms and rom_files
  const associatedRoms = await db
    .select({ id: roms.id, path: roms.path })
    .from(roms)
    .where(eq(roms.gameId, id));
  const romIds = associatedRoms.map((r) => r.id);
  const romPaths = associatedRoms.map((r) => r.path).filter((p): p is string => Boolean(p));

  const associatedFiles =
    romIds.length > 0
      ? await db.select({ path: romFiles.path }).from(romFiles).where(inArray(romFiles.romId, romIds))
      : [];
  const allPaths = Array.from(new Set([...romPaths, ...associatedFiles.map((f) => f.path)]));

  // Run cascade deletions in a transaction
  await db.transaction(async (tx) => {
    await tx.delete(gamePlatforms).where(eq(gamePlatforms.gameId, id));
    if (romIds.length > 0) {
      await tx.delete(romFiles).where(inArray(romFiles.romId, romIds));
    }
    await tx.delete(roms).where(eq(roms.gameId, id));
    await tx.delete(games).where(eq(games.id, id));
  });

  return allPaths;
}

export async function getSystems() {
  const allSystems = await db.select().from(systems).orderBy(systems.name, systems.id);
  if (allSystems.length === 0) return [];

  // Get active ROM counts grouped by systemId
  const romCounts = await db
    .select({
      systemId: roms.systemId,
      count: sql<number>`count(${roms.id})`.mapWith(Number),
    })
    .from(roms)
    .where(eq(roms.pendingDelete, false))
    .groupBy(roms.systemId);

  const countMap = new Map(
    romCounts
      .filter((rc): rc is { systemId: string; count: number } => Boolean(rc.systemId))
      .map((rc) => [rc.systemId, rc.count])
  );

  const allFirmware = await db.select().from(systemFirmware);
  const allFirmwareWithFiles = await attachFilesToFirmware(allFirmware);
  const firmwareMap = groupByKey(allFirmwareWithFiles, (fw) => fw.systemId);

  return allSystems.map((sys) => ({
    ...sys,
    firmware: firmwareMap.get(sys.id) || [],
    romCount: countMap.get(sys.id) || 0,
  }));
}

export async function attachFilesToFirmware<T extends { id: string; filename: string; path?: string | null; sha1?: string | null; md5?: string | null; crc32?: string | null }>(firmwareList: T[]) {
  if (firmwareList.length === 0) return [];
  const allFiles = await db.select().from(systemFirmwareFiles);
  const filesByFwId = groupByKey(allFiles, (f) => f.firmwareId);

  return firmwareList.map((fw) => {
    const childFiles = filesByFwId.get(fw.id) || [];
    const files = childFiles.length > 0 ? childFiles : (fw.path ? [{
      id: fw.id,
      firmwareId: fw.id,
      relPath: fw.filename,
      path: fw.path,
      filename: fw.filename,
      size: 0,
      sha1: fw.sha1 ?? null,
      md5: fw.md5 ?? null,
      crc32: fw.crc32 ?? null,
    }] : []);
    return {
      ...fw,
      files,
    };
  });
}

export async function getSystemBySlug(slug: string) {
  const system = await db.select().from(systems).where(eq(systems.slug, slug)).get();
  if (!system) return null;

  const rawFirmware = await db
    .select()
    .from(systemFirmware)
    .where(eq(systemFirmware.systemId, system.id));
  const firmware = await attachFilesToFirmware(rawFirmware);
  const activeRoms = await db
    .select({ count: sql<number>`count(${roms.id})`.mapWith(Number) })
    .from(roms)
    .where(and(eq(roms.systemId, system.id), eq(roms.pendingDelete, false)))
    .get();

  return {
    ...system,
    firmware,
    romCount: activeRoms?.count || 0,
  };
}

export async function deleteSystem(idOrSlug: string) {
  const system = await db
    .select()
    .from(systems)
    .where(or(eq(systems.id, idOrSlug), eq(systems.slug, idOrSlug)))
    .get();
  if (!system) return null;

  const activeRoms = await db
    .select({ id: roms.id })
    .from(roms)
    .where(and(eq(roms.systemId, system.id), eq(roms.pendingDelete, false)))
    .limit(1);

  if (activeRoms.length > 0) {
    throw new Error("Cannot delete system that has active ROMs assigned to it.");
  }

  // Clean up any pendingDelete roms referencing this system to preserve FK constraints
  await db.delete(roms).where(eq(roms.systemId, system.id));
  // Clean up any associated system firmware
  await db.delete(systemFirmware).where(eq(systemFirmware.systemId, system.id));
  // Delete the system record
  await db.delete(systems).where(eq(systems.id, system.id));
  return system;
}

export async function getGamesBySystem(systemId: string) {
  return await db
    .selectDistinct({
      id: games.id,
      name: games.name,
      slug: games.slug,
      description: games.description,
      backgroundImage: games.backgroundImage,
      released: games.released,
      rating: games.rating,
    })
    .from(games)
    .innerJoin(roms, eq(games.id, roms.gameId))
    .where(and(eq(roms.systemId, systemId), eq(roms.pendingDelete, false)))
    .orderBy(games.name);
}

export async function getGamesBySystemSlug(systemSlug: string) {
  const system = await getSystemBySlug(systemSlug);
  if (!system) return [];
  return getGamesBySystem(system.id);
}

export async function getRomsBySystem(systemId: string) {
  return await db
    .select({
      id: roms.id,
      filename: roms.filename,
      path: roms.path,
      size: roms.size,
      gameId: games.id,
      gameName: games.name,
      gameSlug: games.slug,
      backgroundImage: games.backgroundImage,
    })
    .from(roms)
    .leftJoin(games, eq(roms.gameId, games.id))
    .where(and(eq(roms.systemId, systemId), eq(roms.pendingDelete, false)));
}

export async function getRomsBySystemSlug(systemSlug: string) {
  const system = await getSystemBySlug(systemSlug);
  if (!system) return [];
  return getRomsBySystem(system.id);
}

export async function getSettings() {
  return await db.select().from(settings);
}

export async function upsertSetting(key: string, value: string) {
  return await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .returning();
}

async function getSystemWithFirmware(systemId: string | null) {
  if (!systemId) return null;
  const sysRow = await db.select().from(systems).where(eq(systems.id, systemId)).get();
  if (!sysRow) return null;
  const rawFirmware = await db
    .select()
    .from(systemFirmware)
    .where(eq(systemFirmware.systemId, sysRow.id));
  const firmware = await attachFilesToFirmware(rawFirmware);
  return { ...sysRow, firmware };
}

export async function getRomById(id: string) {
  const rom = await db
    .select()
    .from(roms)
    .where(and(eq(roms.id, id), eq(roms.pendingDelete, false)))
    .get();
  if (!rom) return null;

  const system = await getSystemWithFirmware(rom.systemId);
  const firmware = system?.firmware || [];
  const files = await db.select().from(romFiles).where(eq(romFiles.romId, id));
  const { emulatable, emulatorCore } = resolveEmulationState(
    system?.slug || system?.name,
    system?.esFolder || system?.path,
    system || {}
  );

  return {
    ...rom,
    files,
    firmware,
    platform: system ? system.name : "unknown",
    emulatable,
    emulatorCore,
    system,
  };
}

export const DEFAULT_FILE_TYPES = [
  { extension: "nes", magicNumber: "4E45531A", description: "Nintendo Entertainment System ROM" },
  { extension: "sfc", magicNumber: null, description: "Super Nintendo ROM" },
  { extension: "smc", magicNumber: null, description: "Super Nintendo ROM" },
  { extension: "gb", magicNumber: null, description: "Game Boy ROM" },
  { extension: "gbc", magicNumber: null, description: "Game Boy Color ROM" },
  { extension: "gba", magicNumber: null, description: "Game Boy Advance ROM" },
  { extension: "n64", magicNumber: null, description: "Nintendo 64 ROM" },
  { extension: "z64", magicNumber: null, description: "Nintendo 64 ROM" },
  { extension: "v64", magicNumber: null, description: "Nintendo 64 ROM" },
  { extension: "md", magicNumber: null, description: "Sega Genesis / Mega Drive ROM" },
  { extension: "gen", magicNumber: null, description: "Sega Genesis ROM" },
  { extension: "smd", magicNumber: null, description: "Sega Genesis ROM" },
  { extension: "bin", magicNumber: null, description: "Binary ROM / BIOS" },
  { extension: "iso", magicNumber: null, description: "Disc Image" },
  { extension: "cue", magicNumber: null, description: "Cue Sheet" },
  { extension: "chd", magicNumber: null, description: "Compressed Hunks of Data (CHD)" },
  { extension: "pbp", magicNumber: null, description: "PlayStation Portable / PS1 Eboot" },
  { extension: "rom", magicNumber: null, description: "Generic BIOS / ROM" },
  { extension: "bios", magicNumber: null, description: "Generic BIOS" },
];

export async function getFileTypeWhitelist() {
  return await db.select().from(fileTypeWhitelist);
}

export async function seedDefaultFileTypeWhitelist() {
  const existing = await db.select().from(fileTypeWhitelist);
  if (existing.length > 0) return;

  for (const item of DEFAULT_FILE_TYPES) {
    await db.insert(fileTypeWhitelist).values({
      id: crypto.randomUUID(),
      extension: item.extension.toLowerCase(),
      magicNumber: item.magicNumber || null,
      description: item.description,
      enabled: true,
    });
  }
}

export async function upsertFileTypeWhitelistEntry(data: {
  id?: string;
  extension: string;
  magicNumber?: string | null;
  description?: string | null;
  enabled?: boolean;
}) {
  const id = data.id || crypto.randomUUID();
  const extension = data.extension.trim().toLowerCase().replace(/^\./, "");
  const magicNumber = data.magicNumber ? data.magicNumber.trim().toUpperCase() : null;
  const description = data.description ? data.description.trim() : null;
  const enabled = data.enabled !== undefined ? data.enabled : true;

  return await db
    .insert(fileTypeWhitelist)
    .values({
      id,
      extension,
      magicNumber,
      description,
      enabled,
    })
    .onConflictDoUpdate({
      target: fileTypeWhitelist.id,
      set: {
        extension,
        magicNumber,
        description,
        enabled,
      },
    })
    .returning();
}

export async function deleteFileTypeWhitelistEntry(id: string) {
  return await db.delete(fileTypeWhitelist).where(eq(fileTypeWhitelist.id, id));
}


