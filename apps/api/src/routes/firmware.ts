import { Hono } from "hono";
import { db } from "../db/index.ts";
import { systemFirmware, systemFirmwareFiles, scannedFiles, systems } from "../db/schema.ts";
import { SystemFirmwareSchema } from "@repo/shared";
import { eq, inArray } from "drizzle-orm";
import { assertWithinRoots, getAllowedStorageRoots, getBiosDir, isWithinRoots, PathPolicyViolation } from "../path-policy.ts";
import { stat, mkdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path, { basename } from "node:path";
import { attachFilesToFirmware } from "../db/queries.ts";
import { computeCrc32 } from "../hasher.ts";
import { isZipFile, extractZipEntries, sanitizeZipEntryPath } from "../zip-util.ts";
import { createHash } from "node:crypto";

export const firmwareRouter = new Hono();

// GET / - List all firmware definitions with member files
firmwareRouter.get("/", async (c) => {
    const list = await db.select().from(systemFirmware);
    const withFiles = await attachFilesToFirmware(list);
    return c.json(withFiles);
});

// GET /:id/file or GET /files/:fileId - Stream a specific firmware file or the primary file
async function handleFileStream(filePath: string, filenameFallback: string, c: any) {
    const allowedRoots = await getAllowedStorageRoots();
    if (!isWithinRoots(allowedRoots, filePath)) {
        return c.json({ error: "Access to requested firmware path is forbidden" }, 403);
    }

    let fileStat;
    try {
        fileStat = await stat(filePath);
    } catch {
        return c.json({ error: "Firmware file not found on server disk" }, 404);
    }

    const stream = createReadStream(filePath);
    const safeFilename = basename(filenameFallback || filePath).replace(/["\r\n]/g, "");
    return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 200,
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": fileStat.size.toString(),
            "Content-Disposition": `attachment; filename="${safeFilename}"`,
        },
    });
}

firmwareRouter.get("/files/:fileId", async (c) => {
    const fileId = c.req.param("fileId");
    const file = await db.select().from(systemFirmwareFiles).where(eq(systemFirmwareFiles.id, fileId)).get();
    if (!file) return c.notFound();
    return handleFileStream(file.path, file.filename, c);
});

firmwareRouter.get("/:id/file", async (c) => {
    const id = c.req.param("id");

    // 1. Try finding by child file id first
    const childFile = await db.select().from(systemFirmwareFiles).where(eq(systemFirmwareFiles.id, id)).get();
    if (childFile) {
        return handleFileStream(childFile.path, childFile.filename, c);
    }

    // 2. Try finding by firmware bundle id
    const fw = await db.select().from(systemFirmware).where(eq(systemFirmware.id, id)).get();
    if (!fw) return c.notFound();

    // Check if firmware has child files
    const files = await db.select().from(systemFirmwareFiles).where(eq(systemFirmwareFiles.firmwareId, id));
    if (files.length > 0) {
        return handleFileStream(files[0].path, files[0].filename, c);
    }

    if (!fw.path) {
        return c.json({ error: "Firmware path not set" }, 404);
    }

    return handleFileStream(fw.path, fw.filename, c);
});

// GET /:id - Single firmware entry
firmwareRouter.get("/:id", async (c) => {
    const id = c.req.param("id");
    const fw = await db.select().from(systemFirmware).where(eq(systemFirmware.id, id)).get();
    if (!fw) return c.notFound();
    const withFiles = await attachFilesToFirmware([fw]);
    return c.json(withFiles[0]);
});

// POST / - Register mapped firmware (supports both legacy single-file and multi-file payloads)
firmwareRouter.post("/", async (c) => {
    const body = await c.req.json();
    const parseResult = SystemFirmwareSchema.safeParse(body);

    if (!parseResult.success) {
        return c.json({ error: "Invalid firmware payload", details: parseResult.error.format() }, 400);
    }

    const fw = parseResult.data;
    const allowedRoots = await getAllowedStorageRoots();

    const id = fw.id || crypto.randomUUID();
    const childFilesInput = fw.files && fw.files.length > 0 ? fw.files : [];

    // Security check: validate all paths are within allowed storage roots
    try {
        if (fw.path) {
            assertWithinRoots(allowedRoots, fw.path, "Firmware path");
        }
        for (const f of childFilesInput) {
            assertWithinRoots(allowedRoots, f.path, `Firmware child file path (${f.filename})`);
        }
    } catch (err) {
        if (err instanceof PathPolicyViolation) {
            return c.json({ error: "Firmware path must be within allowed library storage roots" }, 400);
        }
        return c.json({ error: "Failed to validate firmware path" }, 400);
    }

    const primaryFilename = fw.filename || (childFilesInput.length > 0 ? childFilesInput[0].filename : "firmware.bin");
    const primaryPath = fw.path || (childFilesInput.length > 0 ? childFilesInput[0].path : "");

    if (!primaryPath) {
        return c.json({ error: "A valid firmware path must be provided" }, 400);
    }

    try {
        const totalSize = fw.totalSize || childFilesInput.reduce((acc, f) => acc + (f.size || 0), 0);

        const result = await db.insert(systemFirmware).values({
            id,
            systemId: fw.systemId,
            name: fw.name || fw.filename,
            filename: primaryFilename,
            description: fw.description,
            path: primaryPath,
            totalSize,
            md5: fw.md5 || (childFilesInput.length === 1 ? childFilesInput[0].md5 : null),
            crc32: fw.crc32 || (childFilesInput.length === 1 ? childFilesInput[0].crc32 : null),
            sha1: fw.sha1 || (childFilesInput.length === 1 ? childFilesInput[0].sha1 : null),
        }).returning();

        // Insert child files
        const filesToInsert = childFilesInput.length > 0
            ? childFilesInput.map((f) => ({
                id: f.id || crypto.randomUUID(),
                firmwareId: id,
                relPath: f.relPath || f.filename,
                path: f.path,
                filename: f.filename,
                size: f.size || 0,
                sha1: f.sha1 ?? null,
                md5: f.md5 ?? null,
                crc32: f.crc32 ?? null,
            }))
            : [{
                id: crypto.randomUUID(),
                firmwareId: id,
                relPath: primaryFilename,
                path: primaryPath,
                filename: primaryFilename,
                size: 0,
                sha1: fw.sha1 ?? null,
                md5: fw.md5 ?? null,
                crc32: fw.crc32 ?? null,
            }];

        for (const fileRow of filesToInsert) {
            await db.insert(systemFirmwareFiles).values(fileRow);
        }

        // Clean up any matching scannedFiles from unmapped table
        const allPaths = [primaryPath, ...filesToInsert.map(f => f.path)];
        await db.delete(scannedFiles).where(inArray(scannedFiles.path, allPaths));

        const createdWithFiles = await attachFilesToFirmware(result);
        return c.json({ status: "success", firmware: createdWithFiles[0] });
    } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : "";
        const cause = e && typeof e === "object" && "cause" in e ? (e as { cause?: unknown }).cause : undefined;
        const causeMsg = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
        const fullMsg = `${errorMsg} ${causeMsg}`;
        if (fullMsg.includes("UNIQUE constraint failed: system_firmware.path") || fullMsg.includes("duplicate key value")) {
             return c.json({ error: "Path already mapped" }, 409);
        }
        console.error("Error adding firmware:", e);
        return c.json({ error: "Failed to add firmware" }, 500);
    }
});

// POST /upload - Direct multi-file and ZIP firmware upload
firmwareRouter.post("/upload", async (c) => {
    let formData;
    try {
        formData = await c.req.formData();
    } catch {
        return c.json({ error: "Failed to parse multipart form data" }, 400);
    }

    const systemId = formData.get("systemId");
    if (!systemId || typeof systemId !== "string") {
        return c.json({ error: "Missing required systemId field" }, 400);
    }

    // Verify system exists
    const sys = await db.select().from(systems).where(eq(systems.id, systemId)).get();
    if (!sys) {
        return c.json({ error: `System with id "${systemId}" not found` }, 404);
    }

    const rawName = formData.get("name");
    const customName = typeof rawName === "string" ? rawName.trim() || null : null;
    const rawDesc = formData.get("description");
    const description = typeof rawDesc === "string" ? rawDesc.trim() || null : null;

    // Collect uploaded file objects
    const fileEntries = formData.getAll("files");
    const fallbackSingle = formData.get("file");
    if (fallbackSingle) {
        fileEntries.push(fallbackSingle);
    }

    const files = fileEntries.filter((f): f is File => f instanceof Object && "arrayBuffer" in f && Boolean((f as File).name));
    if (files.length === 0) {
        return c.json({ error: "No files uploaded" }, 400);
    }

    // Determine target directory inside BIOS folder
    const biosBaseDir = await getBiosDir();
    const systemSlug = sys.slug || sys.id;
    const firmwareId = crypto.randomUUID();
    const targetDir = path.resolve(biosBaseDir, systemSlug, firmwareId);

    // Validate path within allowed storage roots
    const allowedRoots = await getAllowedStorageRoots();
    try {
        assertWithinRoots(allowedRoots, targetDir, "Target upload directory");
    } catch {
        return c.json({ error: "Target firmware storage directory is outside allowed library roots" }, 400);
    }

    await mkdir(targetDir, { recursive: true });

    interface SavedFileRecord {
        id: string;
        filename: string;
        relPath: string;
        path: string;
        size: number;
        sha1: string;
        md5: string;
        crc32: string;
    }

    const savedFiles: SavedFileRecord[] = [];

    try {
        for (const file of files) {
            const rawBytes = Buffer.from(await file.arrayBuffer());

            if (isZipFile(rawBytes)) {
                // Extract ZIP archive
                const entries = extractZipEntries(rawBytes);
                for (const entry of entries) {
                    const filePath = path.resolve(targetDir, entry.filename);
                    assertWithinRoots(allowedRoots, filePath, "Extracted zip file path");
                    await mkdir(path.dirname(filePath), { recursive: true });
                    await writeFile(filePath, entry.data);

                    const sha1 = createHash("sha1").update(entry.data).digest("hex");
                    const md5 = createHash("md5").update(entry.data).digest("hex");
                    const crc32 = computeCrc32(entry.data);

                    savedFiles.push({
                        id: crypto.randomUUID(),
                        filename: basename(entry.filename),
                        relPath: entry.filename,
                        path: filePath,
                        size: entry.data.length,
                        sha1,
                        md5,
                        crc32,
                    });
                }
            } else {
                // Single regular file
                const safeName = sanitizeZipEntryPath(file.name) || basename(file.name);
                const filePath = path.resolve(targetDir, safeName);
                assertWithinRoots(allowedRoots, filePath, "Uploaded file path");
                await mkdir(path.dirname(filePath), { recursive: true });
                await writeFile(filePath, rawBytes);

                const sha1 = createHash("sha1").update(rawBytes).digest("hex");
                const md5 = createHash("md5").update(rawBytes).digest("hex");
                const crc32 = computeCrc32(rawBytes);

                savedFiles.push({
                    id: crypto.randomUUID(),
                    filename: safeName,
                    relPath: safeName,
                    path: filePath,
                    size: rawBytes.length,
                    sha1,
                    md5,
                    crc32,
                });
            }
        }

        if (savedFiles.length === 0) {
            return c.json({ error: "No valid firmware files could be extracted from upload" }, 400);
        }

        const primary = savedFiles[0];
        const totalSize = savedFiles.reduce((acc, f) => acc + f.size, 0);
        const bundleName = customName || (files.length === 1 ? files[0].name.replace(/\.[^/.]+$/, "") : `${sys.name} Firmware`);

        const inserted = await db.insert(systemFirmware).values({
            id: firmwareId,
            systemId,
            name: bundleName,
            filename: primary.filename,
            description,
            path: targetDir, // Use dedicated bundle directory as path to ensure uniqueness
            totalSize,
            sha1: savedFiles.length === 1 ? primary.sha1 : null,
            md5: savedFiles.length === 1 ? primary.md5 : null,
            crc32: savedFiles.length === 1 ? primary.crc32 : null,
        }).returning();

        for (const sf of savedFiles) {
            await db.insert(systemFirmwareFiles).values({
                id: sf.id,
                firmwareId,
                relPath: sf.relPath,
                path: sf.path,
                filename: sf.filename,
                size: sf.size,
                sha1: sf.sha1,
                md5: sf.md5,
                crc32: sf.crc32,
            });
        }

        const withFiles = await attachFilesToFirmware(inserted);
        return c.json({ status: "success", firmware: withFiles[0] }, 201);
    } catch (err: unknown) {
        console.error("Failed to process firmware upload:", err);
        return c.json({ error: err instanceof Error ? err.message : "Failed to upload firmware" }, 500);
    }
});

// DELETE /:id - Removes firmware and associated child files
firmwareRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        await db.delete(systemFirmwareFiles).where(eq(systemFirmwareFiles.firmwareId, id));
        await db.delete(systemFirmware).where(eq(systemFirmware.id, id));
        return c.json({ success: true, message: `Firmware ${id} removed.` });
    } catch (e) {
        console.error("Failed to delete firmware", e);
        return c.json({ error: "Failed to delete firmware" }, 500);
    }
});
