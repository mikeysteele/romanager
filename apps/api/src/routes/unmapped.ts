import { Hono } from "@hono/hono";
import { db } from "../db/index.ts";
import { scannedFiles } from "../db/schema.ts";
import { eq, inArray } from "drizzle-orm";

export const unmappedRouter = new Hono();

unmappedRouter.get("/", async (c) => {
    try {
        const files = await db.select()
            .from(scannedFiles)
            .where(eq(scannedFiles.ignored, false));
        return c.json(files);
    } catch (e) {
        console.error("Error fetching unmapped files:", e);
        return c.json({ error: "Failed to fetch unmapped files" }, 500);
    }
});

unmappedRouter.post("/:id/ignore", async (c) => {
    const id = c.req.param("id");
    try {
        await db.update(scannedFiles)
            .set({ ignored: true })
            .where(eq(scannedFiles.id, id));
        return c.json({ success: true });
    } catch (e) {
        console.error("Error ignoring file:", e);
        return c.json({ error: "Failed to ignore file" }, 500);
    }
});

unmappedRouter.post("/bulk-ignore", async (c) => {
    try {
        const { ids } = await c.req.json();
        if (!Array.isArray(ids) || ids.length === 0) {
            return c.json({ error: "Invalid IDs provided" }, 400);
        }
        
        await db.update(scannedFiles)
            .set({ ignored: true })
            .where(inArray(scannedFiles.id, ids));
            
        return c.json({ success: true, count: ids.length });
    } catch (e) {
        console.error("Error in bulk ignore:", e);
        return c.json({ error: "Failed to perform bulk ignore" }, 500);
    }
});

// Clear all unmapped staged files
const clearAllUnmapped = async (c: any) => {
    try {
        await db.delete(scannedFiles);
        return c.json({ success: true, message: "All unmapped files cleared." });
    } catch (e) {
        console.error("Error clearing unmapped files:", e);
        return c.json({ error: "Failed to clear unmapped files" }, 500);
    }
};

unmappedRouter.delete("/", clearAllUnmapped);
unmappedRouter.post("/clear", clearAllUnmapped);

