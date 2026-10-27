import { Hono } from "hono";
import { db } from "../db/index.ts";
import { roms } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { getDeletionWorker } from "../worker.ts";
import { getRomById } from "../db/queries.ts";
import { getAllowedStorageRoots, isWithinRoots } from "../path-policy.ts";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { basename } from "node:path";

export const romsRouter = new Hono();

async function streamLocalFile(filePath: string, downloadFilename: string) {
    const allowedRoots = await getAllowedStorageRoots();
    if (!isWithinRoots(allowedRoots, filePath)) {
        return { error: "Access to requested file path is forbidden", status: 403 as const };
    }

    let fileStat;
    try {
        fileStat = await stat(filePath);
    } catch {
        return { error: "File not found on server disk", status: 404 as const };
    }

    const stream = createReadStream(filePath);
    const safeFilename = basename(downloadFilename || filePath).replace(/["\r\n]/g, "");
    return {
        response: new Response(Readable.toWeb(stream) as ReadableStream, {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": fileStat.size.toString(),
                "Content-Disposition": `attachment; filename="${safeFilename}"`,
                "Accept-Ranges": "bytes",
            },
        }),
    };
}

romsRouter.get("/", async (c) => {
    try {
        const limitParam = c.req.query("limit");
        const offsetParam = c.req.query("offset");
        let query = db.select().from(roms).where(eq(roms.pendingDelete, false)).orderBy(roms.filename, roms.id);
        if (limitParam) {
            const parsedLimit = parseInt(limitParam, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                const limit = Math.min(parsedLimit, 500);
                query = query.limit(limit) as typeof query;
                if (offsetParam) {
                    const parsedOffset = parseInt(offsetParam, 10);
                    if (!isNaN(parsedOffset) && parsedOffset > 0) {
                        query = query.offset(parsedOffset) as typeof query;
                    }
                }
            }
        }
        const romsList = await query;
        return c.json(romsList);
    } catch (e) {
        console.error("Failed to fetch roms:", e);
        return c.json({ error: "Failed to fetch roms." }, 500);
    }
});

romsRouter.get("/:id/file", async (c) => {
    const id = c.req.param("id");
    try {
        const romData = await getRomById(id);
        if (!romData) return c.notFound();

        const launchFileEntry = romData.files?.find((f) => f.role === "launch") || romData.files?.[0];
        const filePath = launchFileEntry?.path || romData.path;
        const filename = launchFileEntry?.filename || romData.launchFile || romData.filename;

        if (!filePath) {
            return c.json({ error: "ROM file path not available" }, 404);
        }

        const result = await streamLocalFile(filePath, filename);
        if ("error" in result) {
            return c.json({ error: result.error }, result.status);
        }
        return result.response;
    } catch (e) {
        console.error("Failed to stream rom file %s:", id, e);
        return c.json({ error: "Failed to stream rom file." }, 500);
    }
});

romsRouter.get("/:id/files/:fileId", async (c) => {
    const id = c.req.param("id");
    const fileId = c.req.param("fileId");
    try {
        const romData = await getRomById(id);
        if (!romData) return c.notFound();

        const fileEntry = romData.files?.find((f) => f.id === fileId);
        if (!fileEntry || !fileEntry.path) {
            return c.json({ error: "ROM file entry not found" }, 404);
        }

        const result = await streamLocalFile(fileEntry.path, fileEntry.filename || fileEntry.relPath);
        if ("error" in result) {
            return c.json({ error: result.error }, result.status);
        }
        return result.response;
    } catch (e) {
        console.error("Failed to stream rom sub-file %s/%s:", id, fileId, e);
        return c.json({ error: "Failed to stream rom file." }, 500);
    }
});

romsRouter.get("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        const romData = await getRomById(id);
        if (!romData) return c.notFound();
        return c.json(romData);
    } catch (e) {
        console.error("Failed to fetch rom %s:", id, e);
        return c.json({ error: "Failed to fetch rom." }, 500);
    }
});

romsRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");

    try {
        const romData = await getRomById(id);
        if (!romData) return c.notFound();

        // Mark as pending delete to hide immediately
        await db.update(roms).set({ pendingDelete: true }).where(eq(roms.id, id));

        const pathsToDelete: string[] = [];
        if (romData.files && Array.isArray(romData.files)) {
            for (const f of romData.files) {
                if (f.path) pathsToDelete.push(f.path);
            }
        }
        if (romData.path && !pathsToDelete.includes(romData.path)) {
            pathsToDelete.push(romData.path);
        }

        const worker = getDeletionWorker();
        const allowedRoots = await getAllowedStorageRoots();
        
        worker.postMessage({
            type: "DELETE_ROM",
            id: id,
            paths: pathsToDelete,
            allowedRoots,
        });

        // Broadcast to clients so the UI updates
        if (typeof globalThis.dispatchEvent === "function") {
            globalThis.dispatchEvent(new CustomEvent('roms-updated'));
        }

        return c.json({ success: true, message: `ROM ${id} marked for deletion.` }, 202);
    } catch (e) {
        console.error("Failed to dispatch ROM deletion for %s:", id, e);
        return c.json({ error: "Failed to dispatch ROM deletion." }, 500);
    }
});
