import { Hono } from "hono";
import { getFileTypeWhitelist, upsertFileTypeWhitelistEntry, deleteFileTypeWhitelistEntry } from "../db/queries.ts";

export const fileTypesRouter = new Hono();

fileTypesRouter.get("/", async (c) => {
    try {
        const list = await getFileTypeWhitelist();
        return c.json(list);
    } catch (e) {
        console.error("Failed to fetch file type whitelist:", e);
        return c.json({ error: "Failed to fetch file type whitelist" }, 500);
    }
});

fileTypesRouter.post("/", async (c) => {
    try {
        const body = await c.req.json();
        const { id, extension, magicNumber, description, enabled } = body;
        
        if (!extension || typeof extension !== "string" || !extension.trim()) {
            return c.json({ error: "Extension is required" }, 400);
        }

        const result = await upsertFileTypeWhitelistEntry({
            id,
            extension,
            magicNumber,
            description,
            enabled: enabled !== undefined ? Boolean(enabled) : true,
        });

        return c.json({ status: "success", entry: result[0] });
    } catch (e) {
        console.error("Failed to upsert file type whitelist entry:", e);
        return c.json({ error: "Failed to save file type whitelist entry" }, 500);
    }
});

fileTypesRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        await deleteFileTypeWhitelistEntry(id);
        return c.json({ success: true, message: `Whitelist entry ${id} removed.` });
    } catch (e) {
        console.error("Failed to delete whitelist entry:", e);
        return c.json({ error: "Failed to delete whitelist entry" }, 500);
    }
});
