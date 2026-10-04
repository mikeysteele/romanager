import { Hono } from "@hono/hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { games, scannedFiles, roms, systems, platforms, gamePlatforms } from "../db/schema.ts";
import { generateId, slugify } from "../utils.ts";
import { eventBus } from "../sse.ts";

export const importRouter = new Hono();

importRouter.post("/", async (c) => {
    const body = await c.req.json();
    const { scannedFileId, scannedFileIds, gameId, systemId, region, gameData } = body;

    const fileIds: string[] = Array.isArray(scannedFileIds) && scannedFileIds.length > 0
        ? scannedFileIds
        : (scannedFileId ? [scannedFileId] : []);

    if (fileIds.length === 0 || (!gameId && !gameData) || !systemId) {
        return c.json({ error: "Missing required fields" }, 400);
    }

    try {
        // Pre-fetch system if needed outside of transaction to avoid holding DB lock
        const existingSys = await db.select().from(systems).where(eq(systems.id, systemId)).get();
        let sysToInsert: { id: string; name: string; slug: string } | null = null;
        if (!existingSys) {
            const apiKey = Deno.env.get("RAWG_API_KEY");
            if (!apiKey) throw new Error("RAWG_API_KEY not configured, cannot create system.");
            const pRes = await fetch(`https://api.rawg.io/api/platforms/${systemId}?key=${apiKey}`);
            if (!pRes.ok) throw new Error("Invalid systemId: could not fetch from RAWG.");
            const pData = await pRes.json();
            sysToInsert = {
                id: String(pData.id),
                name: pData.name,
                slug: pData.slug
            };
        }

        await db.transaction(async (tx) => {
            // 1. Get Scanned Files
            const filesToImport = [];
            for (const fileId of fileIds) {
                const scannedFile = await tx.select().from(scannedFiles).where(eq(scannedFiles.id, fileId)).get();
                if (!scannedFile) throw new Error(`Scanned file not found: ${fileId}`);
                filesToImport.push(scannedFile);
            }

            // 1.5 Ensure System and Platform Exist Locally
            const currentSys = existingSys || sysToInsert!;
            if (sysToInsert) {
                await tx.insert(systems).values(sysToInsert).onConflictDoNothing();
            }

            await tx.insert(platforms).values({
                id: currentSys.id,
                name: currentSys.name,
                slug: currentSys.slug
            }).onConflictDoNothing();

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
                    finalGameId = await generateId(`game:${slug}`);
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

            // 3. Create Roms
            for (const scannedFile of filesToImport) {
                await tx.insert(roms).values({
                     id: crypto.randomUUID(),
                     gameId: finalGameId,
                     systemId,
                     filename: scannedFile.filename,
                     path: scannedFile.path,
                     size: scannedFile.size,
                     region
                });
            }

            // 3.5 Ensure Game-Platform relation exists
            await tx.insert(gamePlatforms)
                .values({ gameId: finalGameId, platformId: systemId })
                .onConflictDoNothing();

            // 4. Delete from Scanned Files
            for (const fileId of fileIds) {
                await tx.delete(scannedFiles).where(eq(scannedFiles.id, fileId));
            }
        });
        
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'roms-updated'
        });
        if (sysToInsert) {
            eventBus.emit('sse-message', {
                type: 'done',
                action: 'platforms-updated',
                id: sysToInsert.id,
                slug: sysToInsert.slug,
                name: sysToInsert.name
            });
            eventBus.emit('sse-message', {
                type: 'done',
                action: 'platform-created',
                id: sysToInsert.id,
                slug: sysToInsert.slug,
                name: sysToInsert.name
            });
        }

        return c.json({ status: "success", importedCount: fileIds.length });
    } catch (e) {
        console.error("Import failed", e);
        return c.json({ error: "Import failed" }, 500);
    }
});
