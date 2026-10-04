import { Hono } from "@hono/hono";
import { getGames, getGamesBySystem, getGameById, getGameBySlug, searchLocalGames, deleteGameFromDb } from "../db/queries.ts";
import { db } from "../db/index.ts";
import { games, platforms, gamePlatforms, systems } from "../db/schema.ts";
import { generateId, slugify } from "../utils.ts";
import { GameSchema} from "@repo/shared";
import { getDeletionWorker } from "../worker.ts";
import { eventBus } from "../sse.ts";

export const gamesRouter = new Hono();

gamesRouter.get("/", async (c) => {
    const systemId = c.req.query("systemId");
    const slug = c.req.query("slug");
    const search = c.req.query("search");

    if (systemId) {
        const gamesList = await getGamesBySystem(systemId);
        return c.json(gamesList);
    }

    if (search) {
        const results = await searchLocalGames(search);
        return c.json(results);
    }

    // We already fetch games by slug in the DB, so we can support it here
    if (slug) {
        const game = await getGameBySlug(slug);
        return c.json(game ? [game] : []);
    }
    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
    const gamesList = await getGames(limit, offset);
    return c.json(gamesList);
});

gamesRouter.get("/:id", async (c) => {
    const id = c.req.param("id");
    const game = await getGameById(id);
    if (!game) return c.notFound();
    return c.json(game);
});

gamesRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleteFiles = c.req.query("deleteFiles") === "true";
    
    try {
        const game = await getGameById(id);
        if (!game) return c.notFound();

        let pathsToDelete: string[] = [];
        if (deleteFiles) {
            pathsToDelete = await deleteGameFromDb(id);
        } else {
            await deleteGameFromDb(id);
        }

        if (pathsToDelete.length > 0) {
            const worker = getDeletionWorker();
            worker.postMessage({
                type: "DELETE_GAME",
                id: id,
                paths: pathsToDelete
            });
        }

        // Broadcast early optimistic update to sync clients
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'game-deleted',
            id: id
        });
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'roms-updated'
        });

        return c.json({ success: true, message: `Game ${id} deleted.` }, 202);
    } catch (e) {
        console.error(`Failed to dispatch game deletion for ${id}:`, e);
        return c.json({ error: "Failed to dispatch game deletion." }, 500);
    }
});

gamesRouter.post("/add", async (c) => {
    const body = await c.req.json();
    const parseResult = GameSchema.safeParse(body);

    if (!parseResult.success) {
        return c.json({ error: "Invalid game payload", details: parseResult.error.format() }, 400);
    }

    const gameData = parseResult.data;

    // Fallback ID generation if ID isn't a robust canonical one
    const slug = gameData.slug || slugify(gameData.name);
    const id = gameData.id || await generateId(`game:${slug}`);

    try {
        // 1. Upsert Game
        await db.insert(games).values({
            id,
            name: gameData.name,
            slug,
            description: gameData.description,
            backgroundImage: gameData.backgroundImage,
            released: gameData.released,
            rating: gameData.rating
        }).onConflictDoUpdate({
            target: games.id,
            set: {
                name: gameData.name,
                description: gameData.description,
                backgroundImage: gameData.backgroundImage,
                released: gameData.released,
                rating: gameData.rating
            }
        });

        // 2. Upsert Platforms & Relations
        let hasNewPlatforms = false;
        if (gameData.platforms && gameData.platforms.length > 0) {
            for (const plat of gameData.platforms) {
                // Upsert Platform
                await db.insert(platforms)
                    .values({ id: plat.id, name: plat.name, slug: plat.slug })
                    .onConflictDoUpdate({ target: platforms.slug, set: { name: plat.name } });

                // Synchronize with systems table so both tables match
                await db.insert(systems)
                    .values({ id: plat.id, name: plat.name, slug: plat.slug, path: null })
                    .onConflictDoUpdate({ target: systems.slug, set: { name: plat.name } });

                // Insert Relation (ignore if exists)
                await db.insert(gamePlatforms)
                    .values({ gameId: id, platformId: plat.id })
                    .onConflictDoNothing();

                hasNewPlatforms = true;
            }
        }

        // Broadcast SSE updates to all connected clients
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'game-added',
            id
        });
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'roms-updated'
        });

        if (hasNewPlatforms) {
            eventBus.emit('sse-message', {
                type: 'done',
                action: 'platforms-updated'
            });
            eventBus.emit('sse-message', {
                type: 'done',
                action: 'systems-updated'
            });
        }

        return c.json({ status: "success", id });
    } catch (e) {
        console.error("Error adding game with platforms:", e);
        return c.json({ error: "Failed to add game and platforms" }, 500);
    }
});
