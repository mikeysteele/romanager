import { Hono } from "@hono/hono";
import { db } from "../db/index.ts";
import { devices, deviceProfiles, profileRules } from "../db/schema.ts";
import { eq, asc } from "drizzle-orm";
import { requireAuth, createApiKeyRecord, type AuthVariables } from "../auth.ts";
import { generateManifest } from "../manifest.ts";
import { eventBus } from "../sse.ts";
import { savesRouter } from "./saves.ts";
import type { Device, ProfileRule } from "@repo/shared";

export const devicesRouter = new Hono<{ Variables: AuthVariables }>();

// Mount companion saves subrouter
devicesRouter.route("/me/saves", savesRouter);

// ==========================================
// 1. Companion routes (/me/*) - Authenticated
// ==========================================

devicesRouter.get("/me", requireAuth, async (c) => {
  const device = c.get("device");
  if (!device) {
    return c.json({ error: "Unauthorized: Device identity missing" }, 401);
  }

  const profile =
    (await db
      .select()
      .from(deviceProfiles)
      .where(eq(deviceProfiles.deviceId, device.id))
      .get()) || null;

  return c.json({
    device,
    profile,
    serverVersion: "1.0.0",
  });
});

devicesRouter.get("/me/manifest", requireAuth, async (c) => {
  const device = c.get("device");
  if (!device) {
    return c.json({ error: "Unauthorized: Device identity missing" }, 401);
  }

  const manifest = await generateManifest(device.id);
  if (!manifest) {
    return c.json({ error: "Failed to generate manifest" }, 500);
  }

  const etag = `"${manifest.version}"`;
  const ifNoneMatch = c.req.header("if-none-match");

  if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === manifest.version)) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "no-cache",
      },
    });
  }

  c.header("ETag", etag);
  c.header("Cache-Control", "no-cache");
  return c.json(manifest);
});

devicesRouter.get("/me/events", requireAuth, (c) => {
  const device = c.get("device");
  if (!device) {
    return c.json({ error: "Unauthorized: Device identity missing" }, 401);
  }

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": connected\n\n"));

      const onManifestChanged = (data: unknown) => {
        const d = data as { deviceId?: string } | undefined;
        if (!d || !d.deviceId || d.deviceId === device.id) {
          try {
            controller.enqueue(encoder.encode("event: manifest-changed\ndata: {}\n\n"));
          } catch {
            // client disconnected
          }
        }
      };

      eventBus.on("manifest-changed", onManifestChanged);

      const intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(intervalId);
        }
      }, 15000);

      cleanup = () => {
        clearInterval(intervalId);
        eventBus.off("manifest-changed", onManifestChanged);
      };
    },
    cancel() {
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

devicesRouter.post("/me/report", requireAuth, async (c) => {
  const device = c.get("device");
  if (!device) {
    return c.json({ error: "Unauthorized: Device identity missing" }, 401);
  }

  const body = await c.req.json<{
    agentVersion?: string;
    freeDiskBytes?: number;
    lastSyncSummary?: Record<string, unknown>;
  }>();

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    lastSeenAt: now,
    lastReport: JSON.stringify(body),
    updatedAt: now,
  };

  if (body.agentVersion) {
    updateData.agentVersion = body.agentVersion;
  }

  if (body.lastSyncSummary) {
    updateData.lastSyncAt = now;
  }

  await db.update(devices).set(updateData).where(eq(devices.id, device.id));

  return c.json({ status: "ok" });
});

// ==========================================
// 2. Admin routes - Device management
// ==========================================

// List all devices with profiles
devicesRouter.get("/", async (c) => {
  const allDevices = await db.select().from(devices);
  const allProfiles = await db.select().from(deviceProfiles);

  const profileMap = new Map<string, typeof allProfiles[0]>();
  for (const p of allProfiles) {
    profileMap.set(p.deviceId, p);
  }

  const result: Device[] = allDevices.map((d) => {
    const prof = profileMap.get(d.id);
    return {
      id: d.id,
      name: d.name,
      preset: (d.preset as Device["preset"]) || "batocera",
      storageBudgetBytes: d.storageBudgetBytes,
      lastSeenAt: d.lastSeenAt,
      lastSyncAt: d.lastSyncAt,
      agentVersion: d.agentVersion,
      lastReport: d.lastReport,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      profile: prof
        ? {
            deviceId: prof.deviceId,
            regionPreference: prof.regionPreference,
            oneRomPerGame: prof.oneRomPerGame,
            includeFirmware: prof.includeFirmware,
            updatedAt: prof.updatedAt,
          }
        : undefined,
    };
  });

  return c.json(result);
});

// Create new device, profile, and initial API key
devicesRouter.post("/", async (c) => {
  const body = await c.req.json<{
    name?: string;
    preset?: "batocera" | "esde" | "retropie";
    storageBudgetBytes?: number | null;
    profile?: {
      regionPreference?: string;
      oneRomPerGame?: boolean;
      includeFirmware?: boolean;
    };
  }>();

  if (!body.name || body.name.trim() === "") {
    return c.json({ error: "Device name is required" }, 400);
  }

  const deviceId = crypto.randomUUID();
  const name = body.name.trim();
  const preset = body.preset || "batocera";
  const storageBudgetBytes =
    body.storageBudgetBytes !== undefined ? body.storageBudgetBytes : null;

  const now = new Date().toISOString();

  await db.insert(devices).values({
    id: deviceId,
    name,
    preset,
    storageBudgetBytes,
    createdAt: now,
    updatedAt: now,
  });

  const profileData = {
    deviceId,
    regionPreference: body.profile?.regionPreference || "USA,EUR,JPN",
    oneRomPerGame: body.profile?.oneRomPerGame ?? false,
    includeFirmware: body.profile?.includeFirmware ?? true,
    updatedAt: now,
  };

  await db.insert(deviceProfiles).values(profileData);

  // Issue the first device API key
  const apiKey = await createApiKeyRecord(`${name} Key`, deviceId, "device");

  const createdDevice = await db.select().from(devices).where(eq(devices.id, deviceId)).get();

  eventBus.emit("devices-updated", { deviceId });

  return c.json(
    {
      device: createdDevice,
      profile: profileData,
      apiKey,
    },
    201
  );
});

// Get device details with profile and rules
devicesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const device = await db.select().from(devices).where(eq(devices.id, id)).get();

  if (!device) {
    return c.json({ error: "Device not found" }, 404);
  }

  const profile = await db
    .select()
    .from(deviceProfiles)
    .where(eq(deviceProfiles.deviceId, id))
    .get();

  const rules = await db
    .select()
    .from(profileRules)
    .where(eq(profileRules.deviceId, id))
    .orderBy(asc(profileRules.position));

  return c.json({
    ...device,
    profile: profile
      ? {
          ...profile,
          rules,
        }
      : undefined,
  });
});

// Update device and profile
devicesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const device = await db.select().from(devices).where(eq(devices.id, id)).get();

  if (!device) {
    return c.json({ error: "Device not found" }, 404);
  }

  const body = await c.req.json<{
    name?: string;
    preset?: "batocera" | "esde" | "retropie";
    storageBudgetBytes?: number | null;
    profile?: {
      regionPreference?: string;
      oneRomPerGame?: boolean;
      includeFirmware?: boolean;
    };
  }>();

  const now = new Date().toISOString();
  const deviceUpdates: Record<string, unknown> = { updatedAt: now };

  if (body.name !== undefined) deviceUpdates.name = body.name.trim();
  if (body.preset !== undefined) deviceUpdates.preset = body.preset;
  if (body.storageBudgetBytes !== undefined) {
    deviceUpdates.storageBudgetBytes = body.storageBudgetBytes;
  }

  await db.update(devices).set(deviceUpdates).where(eq(devices.id, id));

  if (body.profile) {
    const profUpdates: Record<string, unknown> = { updatedAt: now };
    if (body.profile.regionPreference !== undefined) {
      profUpdates.regionPreference = body.profile.regionPreference;
    }
    if (body.profile.oneRomPerGame !== undefined) {
      profUpdates.oneRomPerGame = body.profile.oneRomPerGame;
    }
    if (body.profile.includeFirmware !== undefined) {
      profUpdates.includeFirmware = body.profile.includeFirmware;
    }

    const existingProfile = await db
      .select()
      .from(deviceProfiles)
      .where(eq(deviceProfiles.deviceId, id))
      .get();

    if (existingProfile) {
      await db.update(deviceProfiles).set(profUpdates).where(eq(deviceProfiles.deviceId, id));
    } else {
      await db.insert(deviceProfiles).values({
        deviceId: id,
        regionPreference: body.profile.regionPreference || "USA,EUR,JPN",
        oneRomPerGame: body.profile.oneRomPerGame ?? false,
        includeFirmware: body.profile.includeFirmware ?? true,
        updatedAt: now,
      });
    }
  }

  eventBus.emit("manifest-changed", { deviceId: id });

  const updatedDevice = await db.select().from(devices).where(eq(devices.id, id)).get();
  const updatedProfile = await db
    .select()
    .from(deviceProfiles)
    .where(eq(deviceProfiles.deviceId, id))
    .get();

  return c.json({
    device: updatedDevice,
    profile: updatedProfile,
  });
});

// Delete device (cascades)
devicesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const device = await db.select().from(devices).where(eq(devices.id, id)).get();

  if (!device) {
    return c.json({ error: "Device not found" }, 404);
  }

  await db.delete(devices).where(eq(devices.id, id));
  eventBus.emit("devices-updated", { deviceId: id });

  return c.json({ status: "success", deletedId: id });
});

// Replace all rules for device
devicesRouter.put("/:id/rules", async (c) => {
  const id = c.req.param("id");
  const device = await db.select().from(devices).where(eq(devices.id, id)).get();

  if (!device) {
    return c.json({ error: "Device not found" }, 404);
  }

  const body = await c.req.json<{
    rules: Array<{
      kind: ProfileRule["kind"];
      targetId: string;
      position?: number;
    }>;
  }>();

  if (!Array.isArray(body.rules)) {
    return c.json({ error: "rules array is required" }, 400);
  }

  // Delete existing rules
  await db.delete(profileRules).where(eq(profileRules.deviceId, id));

  // Insert new rules
  const now = new Date().toISOString();
  const insertedRules: Array<typeof profileRules.$inferSelect> = [];

  for (let i = 0; i < body.rules.length; i++) {
    const r = body.rules[i];
    const ruleRecord = {
      id: crypto.randomUUID(),
      deviceId: id,
      position: r.position !== undefined ? r.position : i,
      kind: r.kind,
      targetId: r.targetId,
      createdAt: now,
    };
    await db.insert(profileRules).values(ruleRecord);
    insertedRules.push(ruleRecord);
  }

  eventBus.emit("manifest-changed", { deviceId: id });

  return c.json({ status: "success", rules: insertedRules });
});

// Preview resolved manifest for a device
devicesRouter.get("/:id/manifest/preview", async (c) => {
  const id = c.req.param("id");
  const manifest = await generateManifest(id);

  if (!manifest) {
    return c.json({ error: "Device not found" }, 404);
  }

  return c.json(manifest);
});
