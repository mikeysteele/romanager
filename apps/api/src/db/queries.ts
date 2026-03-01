import { db } from "./index.ts";
import { games, roms, systems, settings, platforms, gamePlatforms } from "./schema.ts";
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

export async function getGames() {
  return await db.select().from(games).orderBy(games.name);
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
    
    // Map ROMs into their respective platforms
    const platformsWithRoms = gamePlats.map(plat => {
        const platformRoms = rawRoms
            .filter(r => {
                const sysName = r.systemName?.toLowerCase() || "";
                const platName = plat.name.toLowerCase();
                return sysName.includes(platName) || platName.includes(sysName);
            })
            .map(r => r.rom);

        return {
            ...plat,
            roms: platformRoms
        };
    });

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
    return await db.select().from(systems).where(eq(systems.slug, slug)).get();
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
