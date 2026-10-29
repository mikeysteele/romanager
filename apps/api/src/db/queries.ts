import { db } from "./index.ts";
import { games, roms, romFiles, systems, settings, platforms, gamePlatforms, systemFirmware, fileTypeWhitelist } from "./schema.ts";
import { eq, like, inArray, and, or, sql } from "drizzle-orm";
import { slugify } from "../utils.ts";
// Define a generic transaction type compatible across both SQLite and Postgres
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

import { getDefaultEsFolder, getDefaultEmulatorConfig, getCoresForPlatform } from "../platform-mappings.ts";

export interface SystemEmulationOverrides {
  emulatable?: boolean;
  emulatorCore?: string | null;
}

export async function findOrCreateSystem(
  name: string,
  path: string | null = null,
  esFolder: string | null = null,
  txOrOverrides: Tx | SystemEmulationOverrides = db as unknown as Tx,
  maybeTx: Tx = db as unknown as Tx
) {
  let overrides: SystemEmulationOverrides = {};
  let tx: Tx = maybeTx;
  if (txOrOverrides && typeof txOrOverrides === "object" && "select" in txOrOverrides) {
    tx = txOrOverrides;
  } else if (txOrOverrides && typeof txOrOverrides === "object") {
    overrides = txOrOverrides as SystemEmulationOverrides;
  }

  const existing = await tx.select().from(systems).where(eq(systems.name, name));
  if (existing.length > 0) {
    const sys = existing[0];
    const updates: Partial<typeof systems.$inferInsert> = {};
    const folder = esFolder || sys.esFolder || getDefaultEsFolder(sys.slug);
    if (!sys.esFolder && folder) {
      updates.esFolder = folder;
      sys.esFolder = folder;
    }
    const availableCores = getCoresForPlatform(sys.slug || sys.name, folder || sys.path);
    const defaults = getDefaultEmulatorConfig(sys.slug || sys.name, folder || sys.path);

    if (availableCores.length === 0) {
      if (sys.emulatable || sys.emulatorCore !== null) {
        updates.emulatable = false;
        updates.emulatorCore = null;
        sys.emulatable = false;
        sys.emulatorCore = null;
      }
    } else {
      if (overrides.emulatable !== undefined) {
        updates.emulatable = overrides.emulatable;
        sys.emulatable = overrides.emulatable;
      }
      if (overrides.emulatorCore !== undefined) {
        const validCore = overrides.emulatorCore && availableCores.some((c) => c.id === overrides.emulatorCore)
          ? overrides.emulatorCore
          : defaults.emulatorCore || availableCores[0].id;
        updates.emulatorCore = validCore;
        sys.emulatorCore = validCore;
      } else if (sys.emulatorCore === null) {
        if (defaults.emulatorCore) {
          updates.emulatorCore = defaults.emulatorCore;
          sys.emulatorCore = defaults.emulatorCore;
          if (overrides.emulatable === undefined) {
            updates.emulatable = defaults.emulatable;
            sys.emulatable = defaults.emulatable;
          }
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      await tx.update(systems).set(updates).where(eq(systems.id, sys.id));
    }
    return sys;
  }
  const slug = slugify(name);
  const id = crypto.randomUUID();
  const folder = esFolder || getDefaultEsFolder(slug);
  const availableCores = getCoresForPlatform(slug || name, folder || path);
  const defaults = getDefaultEmulatorConfig(slug || name, folder || path);
  const hasCore = availableCores.length > 0;
  const emulatable = hasCore
    ? (overrides.emulatable !== undefined ? overrides.emulatable : defaults.emulatable)
    : false;
  const requestedCore = overrides.emulatorCore !== undefined ? overrides.emulatorCore : defaults.emulatorCore;
  const emulatorCore = hasCore
    ? (requestedCore && availableCores.some((c) => c.id === requestedCore)
        ? requestedCore
        : defaults.emulatorCore || availableCores[0].id)
    : null;
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
    const result = await tx.insert(games).values({
        id,
        name: title,
        slug,
        // Description, released, etc. populated later via metadata fetch
    }).returning();
    return result[0];
}

export async function getGames(limit?: number, offset?: number) {
  let query = db.select().from(games).orderBy(games.name);
  if (limit !== undefined && limit > 0) {
    query = query.limit(limit) as typeof query;
    if (offset !== undefined && offset > 0) {
      query = query.offset(offset) as typeof query;
    }
  }
  return await query;
}

export async function searchLocalGames(query: string) {
    const matchedGames = await db.select().from(games)
                   .where(like(games.name, `%${query}%`))
                   .orderBy(games.name);
                   
    if (matchedGames.length === 0) return [];
    
    const gameIds = matchedGames.map(g => g.id);
    
    // Fetch all platforms for these matched games
    const gamePlats = await db.select({
        gameId: gamePlatforms.gameId,
        id: platforms.id,
        name: platforms.name,
        slug: platforms.slug
    })
    .from(gamePlatforms)
    .innerJoin(platforms, eq(gamePlatforms.platformId, platforms.id))
    .where(inArray(gamePlatforms.gameId, gameIds));

    // Map platforms to correct game
    return matchedGames.map(game => {
        return {
            ...game,
            platforms: gamePlats.filter(p => p.gameId === game.id).map(p => ({
                id: p.id,
                name: p.name,
                slug: p.slug
            }))
        };
    });
}

async function enrichGameWithPlatformsAndRoms(game: typeof games.$inferSelect) {
    // Fetch all platforms for the game
    const gamePlats = await db.select({
        id: platforms.id,
        name: platforms.name,
        slug: platforms.slug
    })
    .from(gamePlatforms)
    .innerJoin(platforms, eq(gamePlatforms.platformId, platforms.id))
    .where(eq(gamePlatforms.gameId, game.id));

    // Fetch associated ROMs with system metadata
    const rawRoms = await db.select({
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
    
    const rawRomIds = rawRoms.map(r => r.rom.id);
    let allRomFiles: (typeof romFiles.$inferSelect)[] = [];
    if (rawRomIds.length > 0) {
        allRomFiles = await db.select().from(romFiles).where(inArray(romFiles.romId, rawRomIds));
    }
    const romFilesMap = new Map<string, (typeof romFiles.$inferSelect)[]>();
    for (const rf of allRomFiles) {
        const list = romFilesMap.get(rf.romId) || [];
        list.push(rf);
        romFilesMap.set(rf.romId, list);
    }

    // Map and deduplicate ROMs into their respective platforms by platform name
    const uniquePlatformsMap = new Map<string, {
        id: string;
        name: string;
        slug: string;
        emulatable: boolean;
        emulatorCore: string | null;
        roms: (typeof roms.$inferSelect & { files?: typeof allRomFiles; emulatable: boolean; emulatorCore: string | null })[];
    }>();

    for (const plat of gamePlats) {
        const platKey = plat.name.toLowerCase().trim();
        const existing = uniquePlatformsMap.get(platKey);

        const matchingRawRoms = rawRoms.filter(r => {
            if (r.rom.systemId === plat.id) return true;
            const sysName = r.systemName?.toLowerCase().trim();
            const platName = plat.name.toLowerCase().trim();
            if (!sysName || !platName) return false;
            return sysName === platName || sysName.includes(platName) || platName.includes(sysName);
        });

        const platformRoms = matchingRawRoms.map(r => {
            const availableCores = getCoresForPlatform(r.systemSlug || r.systemName || plat.slug, r.systemEsFolder);
            const fallback = getDefaultEmulatorConfig(r.systemSlug || r.systemName || plat.slug, r.systemEsFolder);
            const emulatable = availableCores.length > 0 && (
                r.systemEmulatable !== null && r.systemEmulatable !== undefined
                    ? Boolean(r.systemEmulatable)
                    : fallback.emulatable
            );
            const emulatorCore = availableCores.length > 0
                ? (r.systemEmulatorCore ?? fallback.emulatorCore)
                : null;
            return {
                ...r.rom,
                emulatable,
                emulatorCore,
                files: romFilesMap.get(r.rom.id) || []
            };
        });

        const firstRom = platformRoms[0];
        const platCores = getCoresForPlatform(plat.slug || plat.name, null);
        const platFallback = getDefaultEmulatorConfig(plat.slug || plat.name, null);
        const platEmulatable = firstRom ? firstRom.emulatable : (platCores.length > 0 && platFallback.emulatable);
        const platCore = firstRom ? firstRom.emulatorCore : (platCores.length > 0 ? platFallback.emulatorCore : null);

        if (existing) {
            const seenRomIds = new Set(existing.roms.map(r => r.id));
            for (const rom of platformRoms) {
                if (!seenRomIds.has(rom.id)) {
                    existing.roms.push(rom);
                    seenRomIds.add(rom.id);
                }
            }
            if (firstRom) {
                existing.emulatable = firstRom.emulatable;
                existing.emulatorCore = firstRom.emulatorCore;
            }
        } else {
            uniquePlatformsMap.set(platKey, {
                ...plat,
                emulatable: platEmulatable,
                emulatorCore: platCore,
                roms: platformRoms
            });
        }
    }

    const platformsWithRoms = Array.from(uniquePlatformsMap.values());
    return { ...game, platforms: platformsWithRoms };
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
    const associatedRoms = await db.select({ id: roms.id, path: roms.path }).from(roms).where(eq(roms.gameId, id));
    const romIds = associatedRoms.map(r => r.id);
    let allPaths = associatedRoms.map(r => r.path).filter((p): p is string => Boolean(p));

    if (romIds.length > 0) {
        const associatedFiles = await db.select({ path: romFiles.path }).from(romFiles).where(inArray(romFiles.romId, romIds));
        allPaths = Array.from(new Set([...allPaths, ...associatedFiles.map(f => f.path)]));
    }

    // Run cascade deletions in a transaction
    await db.transaction(async (tx) => {
        // 2. Delete Game-Platforms relationships
        await tx.delete(gamePlatforms).where(eq(gamePlatforms.gameId, id));
        // 3. Delete Rom files
        if (romIds.length > 0) {
            await tx.delete(romFiles).where(inArray(romFiles.romId, romIds));
        }
        // 4. Delete Roms
        await tx.delete(roms).where(eq(roms.gameId, id));
        // 5. Delete root Game
        await tx.delete(games).where(eq(games.id, id));
    });

    return allPaths;
}

export async function getSystems() {
  const allSystems = await db.select().from(systems).orderBy(systems.name, systems.id);
  if (allSystems.length === 0) return [];

  // Get active ROM counts grouped by systemId
  const romCounts = await db.select({
    systemId: roms.systemId,
    count: sql<number>`count(${roms.id})`.mapWith(Number)
  })
  .from(roms)
  .where(eq(roms.pendingDelete, false))
  .groupBy(roms.systemId);

  const countMap = new Map<string, number>();
  for (const rc of romCounts) {
    if (rc.systemId) {
      countMap.set(rc.systemId, rc.count);
    }
  }

  const allFirmware = await db.select().from(systemFirmware);
  const firmwareMap = new Map<string, typeof allFirmware>();
  for (const fw of allFirmware) {
    const list = firmwareMap.get(fw.systemId) || [];
    list.push(fw);
    firmwareMap.set(fw.systemId, list);
  }

  return allSystems.map(sys => ({
    ...sys,
    firmware: firmwareMap.get(sys.id) || [],
    romCount: countMap.get(sys.id) || 0,
  }));
}

export async function getSystemBySlug(slug: string) {
    const system = await db.select().from(systems).where(eq(systems.slug, slug)).get();
    if (!system) return null;

    const firmware = await db.select().from(systemFirmware).where(eq(systemFirmware.systemId, system.id));
    const activeRoms = await db.select({ count: sql<number>`count(${roms.id})`.mapWith(Number) })
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
  const system = await db.select().from(systems)
    .where(or(eq(systems.id, idOrSlug), eq(systems.slug, idOrSlug)))
    .get();
  if (!system) return null;

  const activeRoms = await db.select({ id: roms.id })
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
    // Return unique games for a system
    // We select from games where id is in (select game_id from roms where system_id = ...)
    // Or distinct join
    const rows = await db.selectDistinct({
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
    
    return rows;
}

export async function getGamesBySystemSlug(systemSlug: string) {
    const system = await getSystemBySlug(systemSlug);
    if (!system) return [];
    return getGamesBySystem(system.id);
}

export async function getRomsBySystem(systemId: string) {
    return await db.select({
        id: roms.id,
        filename: roms.filename,
        path: roms.path,
        size: roms.size,
        gameId: games.id,
        gameName: games.name, // Access game name via join
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
  return await db.insert(settings).values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .returning();
}

export async function getRomById(id: string) {
    const rom = await db.select().from(roms).where(and(eq(roms.id, id), eq(roms.pendingDelete, false))).get();
    if (!rom) return null;

    let system: (typeof systems.$inferSelect & { firmware?: (typeof systemFirmware.$inferSelect)[] }) | null = null;
    let firmware: (typeof systemFirmware.$inferSelect)[] = [];
    if (rom.systemId) {
        const sysRow = await db.select().from(systems).where(eq(systems.id, rom.systemId)).get();
        if (sysRow) {
            firmware = await db.select().from(systemFirmware).where(eq(systemFirmware.systemId, sysRow.id));
            system = { ...sysRow, firmware };
        }
    }

    const files = await db.select().from(romFiles).where(eq(romFiles.romId, id));
    const availableCores = getCoresForPlatform(system?.slug || system?.name, system?.esFolder || system?.path);
    const fallback = getDefaultEmulatorConfig(system?.slug || system?.name, system?.esFolder || system?.path);
    const emulatable = availableCores.length > 0 && (system ? Boolean(system.emulatable) : fallback.emulatable);
    const emulatorCore = availableCores.length > 0 ? (system?.emulatorCore || fallback.emulatorCore) : null;

    return { 
        ...rom, 
        files,
        firmware,
        platform: system ? system.name : "unknown",
        emulatable,
        emulatorCore,
        system
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
  if (existing.length === 0) {
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
}

export async function upsertFileTypeWhitelistEntry(data: {
  id?: string;
  extension: string;
  magicNumber?: string | null;
  description?: string | null;
  enabled?: boolean;
}) {
  const id = data.id || crypto.randomUUID();
  const extension = data.extension.trim().toLowerCase().replace(/^\./, '');
  const magicNumber = data.magicNumber ? data.magicNumber.trim().toUpperCase() : null;
  const description = data.description ? data.description.trim() : null;
  const enabled = data.enabled !== undefined ? data.enabled : true;

  return await db.insert(fileTypeWhitelist).values({
    id,
    extension,
    magicNumber,
    description,
    enabled,
  }).onConflictDoUpdate({
    target: fileTypeWhitelist.id,
    set: {
      extension,
      magicNumber,
      description,
      enabled,
    }
  }).returning();
}

export async function deleteFileTypeWhitelistEntry(id: string) {
  return await db.delete(fileTypeWhitelist).where(eq(fileTypeWhitelist.id, id));
}

