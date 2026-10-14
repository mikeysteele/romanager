import { Hono } from "hono";
import { db } from "../db/index.ts";
import { roms } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { getDeletionWorker } from "../worker.ts";
import { getRomById } from "../db/queries.ts";

export const romsRouter = new Hono();

romsRouter.get("/", async (c) => {
    try {
        const limitParam = c.req.query("limit");
        const offsetParam = c.req.query("offset");
        let query = db.select().from(roms).where(eq(roms.pendingDelete, false));
        if (limitParam) {
            const limit = parseInt(limitParam, 10);
            if (!isNaN(limit) && limit > 0) {
                query = query.limit(limit) as typeof query;
                if (offsetParam) {
                    const offset = parseInt(offsetParam, 10);
                    if (!isNaN(offset) && offset > 0) {
                        query = query.offset(offset) as typeof query;
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
        
        worker.postMessage({
            type: "DELETE_ROM",
            id: id,
            paths: pathsToDelete
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
