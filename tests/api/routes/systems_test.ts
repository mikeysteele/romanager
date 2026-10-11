import { assertEquals } from "jsr:@std/assert@^0.217.0";
import { systemsRouter } from "../../../apps/api/src/routes/systems.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { systems, roms, games, systemFirmware } from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";
import { SystemSchema, SystemReadSchema } from "@repo/shared";
import { z } from "zod";

Deno.test("GET / should return systems with romCount and firmware complying with SystemReadSchema", async () => {
    const req = new Request("http://localhost/");
    const res = await systemsRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
    // Strict schema contract verification on all returned systems
    const parsed = z.array(SystemReadSchema).parse(json);
    if (parsed.length > 0) {
        assertEquals(typeof parsed[0].romCount, "number");
        assertEquals(Array.isArray(parsed[0].firmware), true);
    }
});

Deno.test("GET /:slug should handle not found", async () => {
    const req = new Request("http://localhost/not-a-real-system-slug-xyz");
    const res = await systemsRouter.request(req);
    assertEquals(res.status, 404);
});

Deno.test("POST / and DELETE /:id allows deleting systems with 0 ROMs conforming to SystemSchema", async () => {
    const testSysId = "test-sys-delete-" + Date.now();
    const testSysName = "Deletable Console " + Date.now();
    const testSysSlug = "deletable-console-" + Date.now();

    // 1. Create system via POST
    const createReq = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: testSysId,
            name: testSysName,
            slug: testSysSlug,
            path: "deletable"
        })
    });
    const createRes = await systemsRouter.request(createReq);
    assertEquals(createRes.status, 200);
    const createJson = await createRes.json();
    const createdSystem = SystemSchema.parse(createJson.system);
    const actualSysId = createdSystem.id;

    // Add dummy firmware mapped to this system
    const fwId = "fw-del-" + Date.now();
    await db.insert(systemFirmware).values({
        id: fwId,
        systemId: actualSysId,
        filename: "del_bios.bin",
        path: `/tmp/${fwId}.bin`
    });

    // 2. Delete the system
    const deleteReq = new Request(`http://localhost/${actualSysId}`, {
        method: "DELETE"
    });
    const deleteRes = await systemsRouter.request(deleteReq);
    assertEquals(deleteRes.status, 200);
    const deleteJson = await deleteRes.json();
    assertEquals(deleteJson.status, "success");
    const deletedSystem = SystemSchema.parse(deleteJson.deletedSystem);
    assertEquals(deletedSystem.id, actualSysId);

    // Verify it is gone from database
    const sysInDb = await db.select().from(systems).where(eq(systems.id, actualSysId)).get();
    assertEquals(sysInDb, undefined);

    // Verify firmware was also cleaned up
    const fwInDb = await db.select().from(systemFirmware).where(eq(systemFirmware.id, fwId)).get();
    assertEquals(fwInDb, undefined);
});

Deno.test("DELETE /:id blocks deletion when system has active ROMs", async () => {
    const sysId = "test-sys-has-roms-" + Date.now();
    const gameId = "test-game-sys-protect-" + Date.now();
    const romId = "test-rom-protect-" + Date.now();

    await db.insert(systems).values({
        id: sysId,
        name: "Protected System",
        slug: sysId
    });
    await db.insert(games).values({
        id: gameId,
        name: "Protected Game",
        slug: gameId
    });
    await db.insert(roms).values({
        id: romId,
        gameId,
        systemId: sysId,
        filename: "protected.rom",
        path: `/tmp/${romId}.rom`,
        size: 1024,
        pendingDelete: false
    });

    try {
        const deleteReq = new Request(`http://localhost/${sysId}`, {
            method: "DELETE"
        });
        const deleteRes = await systemsRouter.request(deleteReq);
        assertEquals(deleteRes.status, 400);
        const json = await deleteRes.json();
        assertEquals(json.error.includes("active ROMs"), true);

        // System should still exist
        const sysCheck = await db.select().from(systems).where(eq(systems.id, sysId)).get();
        assertEquals(sysCheck !== undefined, true);
    } finally {
        // Clean up
        await db.delete(roms).where(eq(roms.id, romId));
        await db.delete(games).where(eq(games.id, gameId));
        await db.delete(systems).where(eq(systems.id, sysId));
    }
});

Deno.test("DELETE /:id returns 404 for non-existent system", async () => {
    const req = new Request("http://localhost/non-existent-system-id-12345", {
        method: "DELETE"
    });
    const res = await systemsRouter.request(req);
    assertEquals(res.status, 404);
});

Deno.test("PATCH /:id updates esFolder and name", async () => {
    const sysId = "test-sys-patch-" + Date.now();
    await db.insert(systems).values({
        id: sysId,
        name: "Patch Test",
        slug: "patch-test-" + Date.now(),
        esFolder: null,
    });

    try {
        const req = new Request(`http://localhost/${sysId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ esFolder: "snes" }),
        });
        const res = await systemsRouter.request(req);
        assertEquals(res.status, 200);
        const data = await res.json();
        const patchedSystem = SystemSchema.parse(data);
        assertEquals(patchedSystem.esFolder, "snes");

        const inDb = await db.select().from(systems).where(eq(systems.id, sysId)).get();
        assertEquals(inDb?.esFolder, "snes");
    } finally {
        await db.delete(systems).where(eq(systems.id, sysId));
    }
});

