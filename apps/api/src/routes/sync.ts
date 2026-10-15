import { Hono } from "hono";
import { db } from "../db/index.ts";
import { romFiles, systemFirmware } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthVariables } from "../auth.ts";
import { generateManifest } from "../manifest.ts";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { getAllowedStorageRoots, isWithinRoots } from "../path-policy.ts";

export const syncRouter = new Hono<{ Variables: AuthVariables }>();

// All sync endpoints require companion authentication
syncRouter.use("/*", requireAuth);

syncRouter.get("/files/:fileId", async (c) => {
  const fileId = c.req.param("fileId");
  const apiKey = c.get("apiKey");
  const device = c.get("device");

  // 1. Locate file record in rom_files or system_firmware
  let filePath: string | null = null;
  let fileSha1: string | null = null;

  const romFile = await db.select().from(romFiles).where(eq(romFiles.id, fileId)).get();
  if (romFile) {
    filePath = romFile.path;
    fileSha1 = romFile.sha1;
  } else {
    const fw = await db.select().from(systemFirmware).where(eq(systemFirmware.id, fileId)).get();
    if (fw) {
      filePath = fw.path;
      fileSha1 = fw.sha1;
    }
  }

  if (!filePath) {
    return c.json({ error: "File not found" }, 404);
  }

  // 1.5 Security check (S-2): Ensure file path is strictly within allowed storage roots
  const allowedRoots = await getAllowedStorageRoots();
  if (!isWithinRoots(allowedRoots, filePath)) {
    return c.json({ error: "Access to requested file path is forbidden" }, 403);
  }

  // 2. Authorization check
  if (apiKey?.scope === "device" && device) {
    const manifest = await generateManifest(device.id);
    if (!manifest) {
      return c.json({ error: "Device profile not found" }, 403);
    }

    const isFileInManifest = manifest.sets.some((s) => s.files.some((f) => f.id === fileId));
    if (!isFileInManifest) {
      return c.json({ error: "Forbidden: file not included in device manifest" }, 403);
    }
  }

  // 3. Stat file on server disk
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return c.json({ error: "File not found on server disk" }, 404);
  }

  const fileSize = fileStat.size;
  const etag = fileSha1 ? `"${fileSha1}"` : `"${fileStat.mtime?.getTime() || 0}"`;

  // 4. Handle ETag conditional request
  const ifNoneMatch = c.req.header("if-none-match");
  if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === fileSha1)) {
    return new Response(null, {
      status: 304,
      headers: {
        "ETag": etag,
        "Accept-Ranges": "bytes",
      },
    });
  }

  // 5. Handle Range requests
  const rangeHeader = c.req.header("range");
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const contentLength = end - start + 1;
    const rangeStream = createReadStream(filePath, { start, end });

    return new Response(Readable.toWeb(rangeStream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": contentLength.toString(),
        "Accept-Ranges": "bytes",
        "ETag": etag,
      },
    });
  }

  // 6. Full file streaming
  const fullStream = createReadStream(filePath);
  return new Response(Readable.toWeb(fullStream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": fileSize.toString(),
      "Accept-Ranges": "bytes",
      "ETag": etag,
    },
  });
});
