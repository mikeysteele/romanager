import { Hono } from "@hono/hono";
import { db } from "../db/index.ts";
import { roms } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { getDeletionWorker } from "../worker.ts";
import { getRomById } from "../db/queries.ts";

export const romsRouter = new Hono();

romsRouter.get("/", async (c) => {
    try {
        const romsList = await db.select().from(roms).where(eq(roms.pendingDelete, false));
        return c.json(romsList);
    } catch (e) {
        console.error("Failed to fetch roms:", e);
        return c.json({ error: "Failed to fetch roms." }, 500);
    }
});

romsRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");

    try {
        const romData = await getRomById(id);
        if (!romData) return c.notFound();

        // Mark as pending delete to hide immediately
        await db.update(roms).set({ pendingDelete: true }).where(eq(roms.id, id));

        const pathsToDelete = [romData.path];

        const worker = getDeletionWorker();
        
        worker.postMessage({
            type: "DELETE_ROM",
            id: id,
            paths: pathsToDelete
        });

        // Broadcast to clients so the UI updates
        globalThis.dispatchEvent(new CustomEvent('roms-updated'));

        return c.json({ success: true, message: `ROM ${id} marked for deletion.` }, 202);
    } catch (e) {
        console.error(`Failed to dispatch ROM deletion for ${id}:`, e);
        return c.json({ error: "Failed to dispatch ROM deletion." }, 500);
    }
});
