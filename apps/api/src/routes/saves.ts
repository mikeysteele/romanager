import { Hono } from "hono";
import { db } from "../db/index.ts";
import { saveFiles, saveVersions, settings } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthVariables } from "../auth.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

export const savesRouter = new Hono<{ Variables: AuthVariables }>();

// All /me/saves routes require device companion auth
savesRouter.use("/*", requireAuth);

export async function getSaveStorageDir(): Promise<string> {
  const custom = await db.select().from(settings).where(eq(settings.key, "saves_dir")).get();
  if (custom && custom.value) {
    return resolve(custom.value);
  }
  return resolve("./storage/saves");
}

// 1. List saves for this device
savesRouter.get("/", async (c) => {
  const device = c.get("device");
  if (!device) return c.json({ error: "Unauthorized" }, 401);

  const files = await db
    .select()
    .from(saveFiles)
    .where(eq(saveFiles.deviceId, device.id));

  const result = [];
  for (const f of files) {
    const versions = await db
      .select()
      .from(saveVersions)
      .where(eq(saveVersions.saveFileId, f.id))
      .orderBy(desc(saveVersions.createdAt));

    result.push({
      id: f.id,
      relativePath: f.relativePath,
      systemId: f.systemId,
      currentSha1: f.currentSha1,
      updatedAt: f.updatedAt,
      versionsCount: versions.length,
      latestVersion: versions[0] || null,
    });
  }

  return c.json(result);
});

// 2. Upload save file
savesRouter.put("/*", async (c) => {
  const device = c.get("device");
  if (!device) return c.json({ error: "Unauthorized" }, 401);

  const rawPath = decodeURIComponent(c.req.path);
  const relativePath = rawPath
    .replace(/^(\/api)?\/devices\/me\/saves\/?/, "")
    .replace(/^\/me\/saves\/?/, "")
    .replace(/^\/+/, "");
  if (!relativePath) {
    return c.json({ error: "Save file relativePath is required" }, 400);
  }

  const clientSha1 = c.req.header("x-sha1");
  const clientMtime = c.req.header("x-mtime") || new Date().toISOString();

  // Check if save file already exists for this device
  let saveFile = await db
    .select()
    .from(saveFiles)
    .where(and(eq(saveFiles.deviceId, device.id), eq(saveFiles.relativePath, relativePath)))
    .get();

  // If already at current SHA-1, return unchanged
  if (saveFile && clientSha1 && saveFile.currentSha1?.toLowerCase() === clientSha1.toLowerCase()) {
    return c.json({ status: "unchanged", sha1: clientSha1 });
  }

  // Read binary body and compute sha1
  const bodyBuffer = await c.req.arrayBuffer();
  const bytes = new Uint8Array(bodyBuffer);
  const actualSha1 = createHash("sha1").update(bytes).digest("hex");

  if (clientSha1 && actualSha1.toLowerCase() !== clientSha1.toLowerCase()) {
    return c.json(
      { error: `Checksum mismatch: expected ${clientSha1}, got ${actualSha1}` },
      400
    );
  }

  if (saveFile && saveFile.currentSha1?.toLowerCase() === actualSha1.toLowerCase()) {
    return c.json({ status: "unchanged", sha1: actualSha1 });
  }

  // Save to disk
  const baseSavesDir = await getSaveStorageDir();
  const storedPath = resolve(baseSavesDir, device.id, relativePath, `${actualSha1}.bin`);
  await mkdir(dirname(storedPath), { recursive: true });
  await writeFile(storedPath, bytes);

  const now = new Date().toISOString();

  if (!saveFile) {
    const saveFileId = crypto.randomUUID();
    const systemId = relativePath.split("/")[0] || null;

    await db.insert(saveFiles).values({
      id: saveFileId,
      deviceId: device.id,
      systemId,
      relativePath,
      currentSha1: actualSha1,
      updatedAt: now,
    });

    saveFile = {
      id: saveFileId,
      deviceId: device.id,
      systemId,
      relativePath,
      currentSha1: actualSha1,
      updatedAt: now,
    };
  } else {
    await db
      .update(saveFiles)
      .set({
        currentSha1: actualSha1,
        updatedAt: now,
      })
      .where(eq(saveFiles.id, saveFile.id));
  }

  // Record version
  const versionId = crypto.randomUUID();
  await db.insert(saveVersions).values({
    id: versionId,
    saveFileId: saveFile.id,
    sha1: actualSha1,
    size: bytes.length,
    deviceMtime: clientMtime,
    storedPath,
    createdAt: now,
  });

  return c.json({
    status: "uploaded",
    saveFileId: saveFile.id,
    versionId,
    sha1: actualSha1,
    size: bytes.length,
  }, 201);
});

// 3. Download save file
savesRouter.get("/*", async (c) => {
  const device = c.get("device");
  if (!device) return c.json({ error: "Unauthorized" }, 401);

  const rawPath = decodeURIComponent(c.req.path);
  const relativePath = rawPath
    .replace(/^(\/api)?\/devices\/me\/saves\/?/, "")
    .replace(/^\/me\/saves\/?/, "")
    .replace(/^\/+/, "");
  if (!relativePath) {
    return c.json({ error: "Save file relativePath is required" }, 400);
  }

  const saveFile = await db
    .select()
    .from(saveFiles)
    .where(and(eq(saveFiles.deviceId, device.id), eq(saveFiles.relativePath, relativePath)))
    .get();

  if (!saveFile) {
    return c.json({ error: "Save file not found" }, 404);
  }

  const requestedVersionId = c.req.query("version");
  let version;

  if (requestedVersionId) {
    version = await db
      .select()
      .from(saveVersions)
      .where(and(eq(saveVersions.saveFileId, saveFile.id), eq(saveVersions.id, requestedVersionId)))
      .get();
  } else {
    version = await db
      .select()
      .from(saveVersions)
      .where(eq(saveVersions.saveFileId, saveFile.id))
      .orderBy(desc(saveVersions.createdAt))
      .get();
  }

  if (!version) {
    return c.json({ error: "Save version not found" }, 404);
  }

  try {
    const stream = createReadStream(version.storedPath);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": version.size.toString(),
        "X-Sha1": version.sha1,
        "X-Mtime": version.deviceMtime || version.createdAt,
      },
    });
  } catch {
    return c.json({ error: "Stored save file missing on disk" }, 404);
  }
});
