import { db } from "./index.ts";
import { games, roms, systems, settings, platforms, gamePlatforms, systemFirmware, fileTypeWhitelist } from "./schema.ts";
import { eq, like, inArray, and } from "drizzle-orm";
import { slugify } from "../utils.ts";
import { SQLiteTransaction } from "drizzle-orm/sqlite-core";

// Define a broad transaction type or use strictly if possible.
// Since we don't know the exact schema generic args here without inference, 
// using 'any' might be necessary but we can label it better or use a partial.
// Actually, let's try to reference the db type.
// deno-lint-ignore no-explicit-any
type Tx = SQLiteTransaction<any, any, any, any>;

export async function findOrCreateSystem(name: string, path: string | null = null, tx: Tx = db as unknown as Tx) {
  const existing = await tx.select().from(systems).where(eq(systems.name, name));
  if (existing.length > 0) {
    return existing[0];
  }
  const slug = slugify(name);
  const id = crypto.randomUUID();
  const result = await tx.insert(systems).values({ id, name, slug, path }).returning();
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

    // Fetch associated ROMs with system name
    const rawRoms = await db.select({
        rom: roms,
        systemName: systems.name
    })
    .from(roms)
    .leftJoin(systems, eq(roms.systemId, systems.id))
    .where(and(eq(roms.gameId, game.id), eq(roms.pendingDelete, false)));
    
    // Map and deduplicate ROMs into their respective platforms by platform name
    const uniquePlatformsMap = new Map<string, { id: string; name: string; slug: string; roms: (typeof roms.$inferSelect)[] }>();

    for (const plat of gamePlats) {
        const platKey = plat.name.toLowerCase().trim();
        const existing = uniquePlatformsMap.get(platKey);

        const platformRoms = rawRoms
            .filter(r => {
                if (r.rom.systemId === plat.id) return true;
                const sysName = r.systemName?.toLowerCase() || "";
                const platName = plat.name.toLowerCase();
                return sysName === platName || sysName.includes(platName) || platName.includes(sysName);
            })
            .map(r => r.rom);

        if (existing) {
            const seenRomIds = new Set(existing.roms.map(r => r.id));
            for (const rom of platformRoms) {
                if (!seenRomIds.has(rom.id)) {
                    existing.roms.push(rom);
                    seenRomIds.add(rom.id);
                }
            }
        } else {
            uniquePlatformsMap.set(platKey, {
                ...plat,
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
    // 1. Get associated ROM paths before deletion
    const associatedRoms = await db.select({ path: roms.path }).from(roms).where(eq(roms.gameId, id));
    const romPaths = associatedRoms.map(r => r.path);

    // Run cascade deletions in a transaction
    await db.transaction(async (tx) => {
        // 2. Delete Game-Platforms relationships
        await tx.delete(gamePlatforms).where(eq(gamePlatforms.gameId, id));
        // 3. Delete Roms
        await tx.delete(roms).where(eq(roms.gameId, id));
        // 4. Delete root Game
        await tx.delete(games).where(eq(games.id, id));
    });

    return romPaths;
}

export async function getSystems() {
  return await db.select().from(systems);
}

export async function getSystemBySlug(slug: string) {
    const system = await db.select().from(systems).where(eq(systems.slug, slug)).get();
    if (!system) return null;

    const firmware = await db.select().from(systemFirmware).where(eq(systemFirmware.systemId, system.id));
    return { ...system, firmware };
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

    let system = null;
    if (rom.systemId) {
        system = await db.select().from(systems).where(eq(systems.id, rom.systemId)).get();
    }
    
    return { 
        ...rom, 
        platform: system ? system.name : "unknown",
        system: system
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

