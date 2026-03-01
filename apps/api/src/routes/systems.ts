import { Hono } from "@hono/hono";
import { getSystems, getSystemBySlug, getGamesBySystemSlug } from "../db/queries.ts";

export const systemsRouter = new Hono();

systemsRouter.get("/", async (c) => {
    const systemsList = await getSystems();
    return c.json(systemsList);
});

systemsRouter.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const system = await getSystemBySlug(slug);
    if (!system) return c.notFound();
    
    const games = await getGamesBySystemSlug(slug);
    return c.json({ ...system, games });
});
