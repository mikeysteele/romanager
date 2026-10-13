import { Hono } from "hono";
import { searchMetadata, fetchPlatforms } from "../metadata.ts";

export const metadataRouter = new Hono();

metadataRouter.get("/search", async (c) => {
    const q = c.req.query("q");
    if (!q) return c.json([]);
    
    const results = await searchMetadata(q);
    return c.json(results);
});

metadataRouter.get("/platforms", async (c) => {
    const platforms = await fetchPlatforms();
    if (platforms.length > 0) {
        return c.json(platforms.map(p => ({
            id: String(p.id),
            name: p.name,
            slug: p.slug
        })));
    }
    return c.json([]);
});
