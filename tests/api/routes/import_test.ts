import { assertEquals } from "jsr:@std/assert@^0.217.0";
import { importRouter } from "../../../apps/api/src/routes/import.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { scannedFiles, roms, systems } from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";

Deno.test("POST / should require fields", async () => {
    const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    const res = await importRouter.request(req);
    assertEquals(res.status, 400);
    const json = await res.json();
    assertEquals(json.error, "Missing required fields");
});

Deno.test("POST / should import multiple scanned files under one game", async () => {
    // 1. Prepare system
    const testSysId = "test-sys-" + Date.now();
    const testTitle = "Crash Bandicoot Batch Test " + Date.now();
    await db.insert(systems).values({
        id: testSysId,
        name: "PlayStation",
        slug: "psx-" + Date.now(),
    });

    // 2. Prepare scanned files (e.g., .cue and .bin)
    const fileId1 = "scan-cue-" + Date.now();
    const fileId2 = "scan-bin-" + Date.now();

    await db.insert(scannedFiles).values([
        {
            id: fileId1,
            filename: "Crash Bandicoot.cue",
            path: `/roms/psx/${fileId1}.cue`,
            size: 150,
            ignored: false,
        },
        {
            id: fileId2,
            filename: "Crash Bandicoot.bin",
            path: `/roms/psx/${fileId2}.bin`,
            size: 500000000,
            ignored: false,
        },
    ]);

    try {
        // 3. Perform batch import
        const req = new Request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scannedFileIds: [fileId1, fileId2],
                systemId: testSysId,
                gameData: {
                    title: testTitle,
                    year: "1996",
                },
            }),
        });

        const res = await importRouter.request(req);
        assertEquals(res.status, 200);
        const result = await res.json();
        assertEquals(result.status, "success");
        assertEquals(result.importedCount, 2);

        // 4. Verify scanned files were deleted
        const remaining1 = await db.select().from(scannedFiles).where(eq(scannedFiles.id, fileId1)).get();
        const remaining2 = await db.select().from(scannedFiles).where(eq(scannedFiles.id, fileId2)).get();
        assertEquals(remaining1, undefined);
        assertEquals(remaining2, undefined);

        // 5. Verify roms were created with the same gameId
        const importedRoms = await db.select().from(roms).where(eq(roms.systemId, testSysId));
        const matchedRoms = importedRoms.filter(r => r.filename.includes("Crash Bandicoot"));
        assertEquals(matchedRoms.length, 2);
        assertEquals(matchedRoms[0].gameId, matchedRoms[1].gameId);
    } finally {
        // Cleanup test data
        await db.delete(roms).where(eq(roms.systemId, testSysId));
        await db.delete(systems).where(eq(systems.id, testSysId));
    }
});

Deno.test("POST / should support single scannedFileId for backward compatibility", async () => {
    const testSysId = "test-sys-single-" + Date.now();
    const testTitle = "Super Mario World " + Date.now();
    await db.insert(systems).values({
        id: testSysId,
        name: "SNES",
        slug: "snes-" + Date.now(),
    });

    const fileId = "scan-single-" + Date.now();
    await db.insert(scannedFiles).values({
        id: fileId,
        filename: "Super Mario World.sfc",
        path: `/roms/snes/${fileId}.sfc`,
        size: 524288,
        ignored: false,
    });

    try {
        const req = new Request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scannedFileId: fileId,
                systemId: testSysId,
                gameData: {
                    title: testTitle,
                    year: "1990",
                },
            }),
        });

        const res = await importRouter.request(req);
        assertEquals(res.status, 200);
        const result = await res.json();
        assertEquals(result.status, "success");
        assertEquals(result.importedCount, 1);

        const remaining = await db.select().from(scannedFiles).where(eq(scannedFiles.id, fileId)).get();
        assertEquals(remaining, undefined);
    } finally {
        await db.delete(roms).where(eq(roms.systemId, testSysId));
        await db.delete(systems).where(eq(systems.id, testSysId));
    }
});


