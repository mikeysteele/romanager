import { Hono, type Context } from "hono";
import { db } from "../db/index.ts";
import { scannedFiles } from "../db/schema.ts";
import { eq, inArray } from "drizzle-orm";

export const unmappedRouter = new Hono();

unmappedRouter.get("/", async (c) => {
    try {
        const limitParam = c.req.query("limit");
        const offsetParam = c.req.query("offset");
        let query = db.select()
            .from(scannedFiles)
            .where(eq(scannedFiles.ignored, false))
            .orderBy(scannedFiles.filename, scannedFiles.id);

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

        const files = await query;
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
const clearAllUnmapped = async (c: Context) => {
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

