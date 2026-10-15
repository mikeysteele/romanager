import { Hono } from "hono";
import { db } from "../db/index.ts";
import { systemFirmware, scannedFiles } from "../db/schema.ts";
import { SystemFirmwareSchema } from "@repo/shared";
import { eq } from "drizzle-orm";
import { assertWithinRoots, getAllowedStorageRoots, PathPolicyViolation } from "../path-policy.ts";

export const firmwareRouter = new Hono();

firmwareRouter.get("/", async (c) => {
    const list = await db.select().from(systemFirmware);
    return c.json(list);
});

firmwareRouter.post("/", async (c) => {
    const body = await c.req.json();
    const parseResult = SystemFirmwareSchema.safeParse(body);

    if (!parseResult.success) {
        return c.json({ error: "Invalid firmware payload", details: parseResult.error.format() }, 400);
    }

    const fw = parseResult.data;

    // Security check (S-2): Validate that firmware path is strictly within allowed storage roots
    try {
        const allowedRoots = await getAllowedStorageRoots();
        assertWithinRoots(allowedRoots, fw.path, "Firmware path");
    } catch (err) {
        if (err instanceof PathPolicyViolation) {
            return c.json({ error: "Firmware path must be within allowed library storage roots" }, 400);
        }
        return c.json({ error: "Failed to validate firmware path" }, 400);
    }

    const id = fw.id || crypto.randomUUID();

    try {
        const result = await db.insert(systemFirmware).values({
            id,
            systemId: fw.systemId,
            filename: fw.filename,
            description: fw.description,
            path: fw.path,
            md5: fw.md5,
            crc32: fw.crc32
        }).returning();

        // If mapped from scanned files, clean up scanned_files table.
        await db.delete(scannedFiles).where(eq(scannedFiles.path, fw.path));

        return c.json({ status: "success", firmware: result[0] });
    } catch (e: unknown) {
        const msg = e instanceof Error ? `${e.message} ${String((e as { cause?: unknown }).cause || "")}` : String(e);
        if (msg.includes("UNIQUE constraint failed: system_firmware.path")) {
             return c.json({ error: "Path already mapped" }, 409);
        }
        console.error("Error adding firmware:", e);
        return c.json({ error: "Failed to add firmware" }, 500);
    }
});

firmwareRouter.delete("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        await db.delete(systemFirmware).where(eq(systemFirmware.id, id));
        return c.json({ success: true, message: `Firmware ${id} removed.` });
    } catch (e) {
        console.error("Failed to delete firmware", e);
        return c.json({ error: "Failed to delete firmware" }, 500);
    }
});
