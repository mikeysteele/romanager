import { Hono } from "hono";
import { getSystems, getSystemBySlug, getGamesBySystemSlug, findOrCreateSystem, deleteSystem } from "../db/queries.ts";
import { eventBus } from "../sse.ts";
import { SystemSchema } from "@repo/shared";
import { db } from "../db/index.ts";
import { systems } from "../db/schema.ts";
import { eq } from "drizzle-orm";

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
        const result = await findOrCreateSystem(sys.name, sys.path, sys.esFolder || null);
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

systemsRouter.patch("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        const body = await c.req.json();
        const updates: { esFolder?: string | null; name?: string; path?: string | null } = {};
        if ("esFolder" in body) updates.esFolder = body.esFolder;
        if ("name" in body) updates.name = body.name;
        if ("path" in body) updates.path = body.path;

        await db.update(systems).set(updates).where(eq(systems.id, id));
        const updated = await db.select().from(systems).where(eq(systems.id, id)).get();
        if (!updated) return c.notFound();
        return c.json(updated);
    } catch (e) {
        return c.json({ error: "Failed to update system", message: String(e) }, 500);
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
