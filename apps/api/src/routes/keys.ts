import { Hono } from "hono";
import { db } from "../db/index.ts";
import { apiKeys } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { createApiKeyRecord } from "../auth.ts";

export const keysRouter = new Hono();

// List all active / non-revoked API keys (safe fields only)
keysRouter.get("/", async (c) => {
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      scope: apiKeys.scope,
      deviceId: apiKeys.deviceId,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys);

  return c.json(rows);
});

// Create new API key
keysRouter.post("/", async (c) => {
  const body = await c.req.json<{
    name?: string;
    scope?: "device" | "admin";
    deviceId?: string | null;
  }>();

  if (!body.name || body.name.trim() === "") {
    return c.json({ error: "Key name is required" }, 400);
  }

  const scope = body.scope || "device";
  const record = await createApiKeyRecord(body.name.trim(), body.deviceId, scope);

  return c.json(record, 201);
});

// Revoke an API key
keysRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const key = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();

  if (!key) {
    return c.json({ error: "API key not found" }, 404);
  }

  const now = new Date().toISOString();
  await db.update(apiKeys).set({ revokedAt: now }).where(eq(apiKeys.id, id));

  return c.json({ status: "success", revokedId: id, revokedAt: now });
});
