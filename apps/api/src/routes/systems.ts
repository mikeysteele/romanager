import { Hono } from "@hono/hono";
import { getSystems, getSystemBySlug, getGamesBySystemSlug, findOrCreateSystem, deleteSystem } from "../db/queries.ts";
import { eventBus } from "../sse.ts";
import { SystemSchema } from "@repo/shared";

export const systemsRouter = new Hono();

systemsRouter.get("/", async (c) => {
    const systemsList = await getSystems();
    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
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
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'platform-created',
            id: result.id,
            slug: result.slug,
            name: result.name
        });
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'system-created',
            id: result.id,
            slug: result.slug,
            name: result.name
        });
        return c.json({ status: "success", system: result, platform: result });
    } catch (e) {
        console.error("Failed to map system manually:", e);
        return c.json({ error: "Failed to create manual platform target", message: String(e) }, 500);
    }
});

systemsRouter.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const system = await getSystemBySlug(slug);
    if (!system) return c.notFound();
    
    const games = await getGamesBySystemSlug(slug);
    return c.json({ ...system, games });
});

systemsRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        const deleted = await deleteSystem(id);
        if (!deleted) {
            return c.json({ error: "Platform not found" }, 404);
        }
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'platform-deleted',
            id: deleted.id,
            slug: deleted.slug,
            name: deleted.name
        });
        eventBus.emit('sse-message', {
            type: 'done',
            action: 'system-deleted',
            id: deleted.id,
            slug: deleted.slug,
            name: deleted.name
        });
        return c.json({ status: "success", deletedPlatform: deleted, deletedSystem: deleted });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return c.json({ error: message }, 400);
    }
});
