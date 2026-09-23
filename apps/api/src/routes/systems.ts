import { Hono } from "@hono/hono";
import { getSystems, getSystemBySlug, getGamesBySystemSlug, findOrCreateSystem } from "../db/queries.ts";

import { SystemSchema } from "@repo/shared";

export const systemsRouter = new Hono();

systemsRouter.get("/", async (c) => {
    const systemsList = await getSystems();
    return c.json(systemsList);
});

systemsRouter.post("/", async (c) => {
    const body = await c.req.json();
    const parseResult = SystemSchema.safeParse(body);
    
    if (!parseResult.success) {
        return c.json({ error: "Invalid payload mapping", details: parseResult.error.format() }, 400);
    }
    
    try {
        const sys = parseResult.data;
        const result = await findOrCreateSystem(sys.name, sys.path);
        return c.json({ status: "success", system: result });
    } catch (e) {
        console.error("Failed to map system manually:", e);
        return c.json({ error: "Failed to create manual system target", message: String(e) }, 500);
    }
});

systemsRouter.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const system = await getSystemBySlug(slug);
    if (!system) return c.notFound();
    
    const games = await getGamesBySystemSlug(slug);
    return c.json({ ...system, games });
});
