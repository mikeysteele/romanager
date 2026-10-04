import { Hono } from "@hono/hono";
import { eq } from "drizzle-orm";
import { dirname } from "@std/path";
import { db } from "../db/index.ts";
import { games, scannedFiles, roms, romFiles, scannedSets, scannedSetFiles, systems, platforms, gamePlatforms } from "../db/schema.ts";
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

            // 3. Create Roms and RomFiles
            const setGroups = new Map<string, typeof filesToImport>();
            const looseFiles: typeof filesToImport = [];

            for (const file of filesToImport) {
                if (file.setId) {
                    const list = setGroups.get(file.setId) || [];
                    list.push(file);
                    setGroups.set(file.setId, list);
                } else {
                    looseFiles.push(file);
                }
            }

            // Process set groups
            for (const [setId, groupFiles] of setGroups.entries()) {
                const sSet = await tx.select().from(scannedSets).where(eq(scannedSets.id, setId)).get();
                const setDbFiles = await tx.select().from(scannedSetFiles).where(eq(scannedSetFiles.setId, setId));
                
                const allFiles = setDbFiles.length > 0 ? setDbFiles : groupFiles;
                const launchFileObj = allFiles.find(f => f.role === "launch") || allFiles[0];
                const totalSize = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
                const launchFilename = launchFileObj?.filename || sSet?.launchFile || groupFiles[0].filename;
                const launchPath = launchFileObj?.path || groupFiles[0].path;
                const basePath = sSet?.basePath || dirname(launchPath);
                const setType = sSet?.setType || (launchFilename.endsWith(".cue") ? "cue" : launchFilename.endsWith(".m3u") ? "m3u" : "single");
                const setHash = sSet?.setHash || null;

                const romId = crypto.randomUUID();
                await tx.insert(roms).values({
                    id: romId,
                    gameId: finalGameId,
                    systemId,
                    name: sSet?.name || launchFilename.substring(0, launchFilename.lastIndexOf(".")) || launchFilename,
                    setType,
                    basePath,
                    launchFile: launchFilename,
                    filename: launchFilename,
                    path: launchPath,
                    size: totalSize,
                    totalSize,
                    setHash,
                    status: sSet?.status || "complete",
                    region,
                    sha1: launchFileObj?.sha1,
                });

                for (const member of allFiles) {
                    await tx.insert(romFiles).values({
                        id: crypto.randomUUID(),
                        romId,
                        relPath: ("relPath" in member && member.relPath) ? member.relPath : member.filename,
                        path: member.path,
                        filename: member.filename,
                        size: member.size,
                        sha1: member.sha1,
                        md5: member.md5,
                        crc32: member.crc32,
                        role: member.role || "launch",
                        mtime: "mtime" in member ? member.mtime : null,
                    }).onConflictDoNothing();
                }

                await tx.delete(scannedSetFiles).where(eq(scannedSetFiles.setId, setId));
                await tx.delete(scannedSets).where(eq(scannedSets.id, setId));
            }

            // Process loose files
            for (const scannedFile of looseFiles) {
                const romId = crypto.randomUUID();
                const totalSize = scannedFile.size || 0;
                await tx.insert(roms).values({
                     id: romId,
                     gameId: finalGameId,
                     systemId,
                     name: scannedFile.filename.substring(0, scannedFile.filename.lastIndexOf(".")) || scannedFile.filename,
                     setType: "single",
                     basePath: dirname(scannedFile.path),
                     launchFile: scannedFile.filename,
                     filename: scannedFile.filename,
                     path: scannedFile.path,
                     size: totalSize,
                     totalSize,
                     setHash: scannedFile.sha1 || null,
                     status: "complete",
                     region,
                     sha1: scannedFile.sha1,
                });

                await tx.insert(romFiles).values({
                    id: crypto.randomUUID(),
                    romId,
                    relPath: scannedFile.filename,
                    path: scannedFile.path,
                    filename: scannedFile.filename,
                    size: totalSize,
                    sha1: scannedFile.sha1,
                    md5: scannedFile.md5,
                    crc32: scannedFile.crc32,
                    role: "launch",
                }).onConflictDoNothing();
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
