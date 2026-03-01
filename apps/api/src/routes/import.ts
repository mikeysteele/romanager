import { Hono } from "@hono/hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { games, scannedFiles, roms, systems, gamePlatforms } from "../db/schema.ts";
import { generateId, slugify } from "../utils.ts";

export const importRouter = new Hono();

importRouter.post("/", async (c) => {
    const body = await c.req.json();
    const { scannedFileId, gameId, systemId, region, gameData } = body;

    if (!scannedFileId || (!gameId && !gameData) || !systemId) {
        return c.json({ error: "Missing required fields" }, 400);
    }

    try {
        await db.transaction(async (tx) => {
            // 1. Get Scanned File
            const scannedFile = await tx.select().from(scannedFiles).where(eq(scannedFiles.id, scannedFileId)).get();
            if (!scannedFile) throw new Error("Scanned file not found");

            // 1.5 Ensure System Exists Locally
            const sys = await tx.select().from(systems).where(eq(systems.id, systemId)).get();
            if (!sys) {
                // Fetch from RAWG to create it
                const apiKey = Deno.env.get("RAWG_API_KEY");
                if (!apiKey) throw new Error("RAWG_API_KEY not configured, cannot create system.");
                const pRes = await fetch(`https://api.rawg.io/api/platforms/${systemId}?key=${apiKey}`);
                if (!pRes.ok) throw new Error("Invalid systemId: could not fetch from RAWG.");
                const pData = await pRes.json();
                await tx.insert(systems).values({
                    id: String(pData.id),
                    name: pData.name,
                    slug: pData.slug
                });
            }

            // 2. Resolve Game ID
            let finalGameId = gameId;
            if (!finalGameId && gameData) {
                const { title, description, coverUrl, year, rating } = gameData;
                const slug = slugify(title);
                
                // Check existing
                const existing = await tx.select().from(games).where(eq(games.slug, slug)).get();
                if (existing) {
                    finalGameId = existing.id;
                } else {
                    finalGameId = generateId(`game:${slug}`);
                    await tx.insert(games).values({
                        id: finalGameId,
                        name: title,
                        slug,
                        description,
                        backgroundImage: coverUrl,
                        released: year,
                        rating
                    });
                }
            }

            // 3. Create Rom
            await tx.insert(roms).values({
                 id: crypto.randomUUID(),
                 gameId: finalGameId,
                 systemId,
                 filename: scannedFile.filename,
                 path: scannedFile.path,
                 size: scannedFile.size,
                 region
            });

            // 3.5 Ensure Game-Platform relation exists
            await tx.insert(gamePlatforms)
                .values({ gameId: finalGameId, platformId: systemId })
                .onConflictDoNothing();

            // 4. Delete from Scanned Files
            await tx.delete(scannedFiles).where(eq(scannedFiles.id, scannedFileId));
        });
        
        return c.json({ status: "success" });
    } catch (e) {
        console.error("Import failed", e);
        return c.json({ error: "Import failed" }, 500);
    }
});
