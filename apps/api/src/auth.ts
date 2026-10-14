import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db/index.ts";
import { apiKeys, devices } from "./db/schema.ts";
import { eq, and, isNull } from "drizzle-orm";
import type { Context, Next } from "hono";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateRawKey(): string {
  let str = "";
  while (str.length < 32) {
    const bytes = randomBytes(32);
    for (let i = 0; i < bytes.length && str.length < 32; i++) {
      // 256 % 62 = 8, so reject bytes >= 248 to eliminate modulo bias
      if (bytes[i] < 248) {
        str += BASE62[bytes[i] % 62];
      }
    }
  }
  return `rmg_${str}`;
}

export function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export async function createApiKeyRecord(
  name: string,
  deviceId?: string | null,
  scope: "device" | "admin" = "device"
) {
  const id = crypto.randomUUID();
  const rawKey = generateRawKey();
  const prefix = rawKey.slice(0, 8);
  const keyHash = hashKey(rawKey);

  await db.insert(apiKeys).values({
    id,
    name,
    prefix,
    keyHash,
    scope,
    deviceId: deviceId || null,
  });

  return {
    id,
    name,
    prefix,
    rawKey,
    scope,
    deviceId,
  };
}

export async function verifyApiKey(rawKey: string) {
  if (!rawKey || typeof rawKey !== "string" || !rawKey.startsWith("rmg_") || rawKey.length < 16) {
    return null;
  }

  const prefix = rawKey.slice(0, 8);
  const candidates = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)));

  if (candidates.length === 0) {
    return null;
  }

  const computedHashHex = hashKey(rawKey);
  const computedHashBuf = Buffer.from(computedHashHex, "hex");

  for (const candidate of candidates) {
    const candidateHashBuf = Buffer.from(candidate.keyHash, "hex");
    if (
      candidateHashBuf.length === computedHashBuf.length &&
      timingSafeEqual(candidateHashBuf, computedHashBuf)
    ) {
      // Key matched. Check lastUsedAt debounce (~60s)
      const now = new Date();
      const lastUsed = candidate.lastUsedAt ? new Date(candidate.lastUsedAt).getTime() : 0;
      if (now.getTime() - lastUsed > 60000) {
        await db
          .update(apiKeys)
          .set({ lastUsedAt: now.toISOString() })
          .where(eq(apiKeys.id, candidate.id));

        if (candidate.deviceId) {
          await db
            .update(devices)
            .set({ lastSeenAt: now.toISOString() })
            .where(eq(devices.id, candidate.deviceId));
        }
      }

      return candidate;
    }
  }

  return null;
}

export type AuthVariables = {
  apiKey: typeof apiKeys.$inferSelect;
  device?: typeof devices.$inferSelect;
};

export async function requireAuth(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const authHeader = c.req.header("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(rmg_[a-zA-Z0-9]+)$/);

  if (!match) {
    return c.json({ error: "Unauthorized: Missing or malformed Authorization header" }, 401);
  }

  const rawKey = match[1];
  const apiKey = await verifyApiKey(rawKey);

  if (!apiKey) {
    return c.json({ error: "Unauthorized: Invalid or revoked API key" }, 401);
  }

  c.set("apiKey", apiKey);

  if (apiKey.deviceId) {
    const device = await db.select().from(devices).where(eq(devices.id, apiKey.deviceId)).get();
    if (!device) {
      return c.json({ error: "Unauthorized: Associated device not found" }, 401);
    }
    c.set("device", device);
  }

  await next();
}
