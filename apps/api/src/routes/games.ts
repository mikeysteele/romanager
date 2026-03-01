import { Hono } from "@hono/hono";
import { getGames, getGamesBySystem, getGameById, getGameBySlug, searchLocalGames, deleteGameFromDb } from "../db/queries.ts";
import { db } from "../db/index.ts";
import { games, platforms, gamePlatforms } from "../db/schema.ts";
import { generateId, slugify } from "../utils.ts";
import { GameSchema} from "@repo/shared";
import { getDeletionWorker } from "../worker.ts";

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
    const gamesList = await getGames();
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
        globalThis.dispatchEvent(new CustomEvent('roms-updated'));

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
        if (gameData.platforms && gameData.platforms.length > 0) {
            for (const plat of gameData.platforms) {
                // Upsert Platform
                await db.insert(platforms)
                    .values({ id: plat.id, name: plat.name, slug: plat.slug })
                    .onConflictDoUpdate({ target: platforms.slug, set: { name: plat.name } });

                // Insert Relation (ignore if exists)
                await db.insert(gamePlatforms)
                    .values({ gameId: id, platformId: plat.id })
                    .onConflictDoNothing();
            }
        }

        // Broadcast update
        globalThis.dispatchEvent(new CustomEvent('roms-updated'));

        return c.json({ status: "success", id });
    } catch (e) {
        console.error("Error adding game with platforms:", e);
        return c.json({ error: "Failed to add game and platforms" }, 500);
    }
});
