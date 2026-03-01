import { Hono } from "@hono/hono";
import { db } from "../db/index.ts";
import { scannedFiles } from "../db/schema.ts";

export const unmappedRouter = new Hono();

unmappedRouter.get("/", async (c) => {
    try {
        const files = await db.select().from(scannedFiles);
        return c.json(files);
    } catch (e) {
        console.error("Error fetching unmapped files:", e);
        return c.json({ error: "Failed to fetch unmapped files" }, 500);
    }
});
