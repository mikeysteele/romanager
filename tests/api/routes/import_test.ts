import { assertEquals } from "@repo/tests/utils/assert";
import { importRouter } from "../../../apps/api/src/routes/import.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { scannedFiles, scannedSets, scannedSetFiles, roms, romFiles, systems } from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";

test("POST / should require fields", async () => {
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

test("POST / should import multiple scanned files under one game", async () => {
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

test("POST / should support single scannedFileId for backward compatibility", async () => {
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

test("POST / should import staged multi-file set with rom_files records", async () => {
    const testSysId = "test-sys-set-" + Date.now();
    const testTitle = "Final Fantasy VII " + Date.now();
    await db.insert(systems).values({
        id: testSysId,
        name: "PlayStation",
        slug: "psx-set-" + Date.now(),
        esFolder: "psx",
    });

    const setId = "test-set-" + Date.now();
    const fileId1 = "set-m3u-" + Date.now();
    const fileId2 = "set-disc1-" + Date.now();
    const fileId3 = "set-disc2-" + Date.now();

    await db.insert(scannedSets).values({
        id: setId,
        name: "Final Fantasy VII",
        setType: "m3u",
        basePath: "/roms/psx/FF7",
        launchFile: "FF7.m3u",
        totalSize: 1000000000,
        status: "complete",
        ignored: false,
    });

    await db.insert(scannedSetFiles).values([
        {
            id: crypto.randomUUID(),
            setId,
            relPath: "FF7.m3u",
            path: `/roms/psx/FF7/FF7.m3u`,
            filename: "FF7.m3u",
            size: 200,
            role: "launch",
        },
        {
            id: crypto.randomUUID(),
            setId,
            relPath: "FF7_Disc1.chd",
            path: `/roms/psx/FF7/FF7_Disc1.chd`,
            filename: "FF7_Disc1.chd",
            size: 500000000,
            role: "disc",
        },
        {
            id: crypto.randomUUID(),
            setId,
            relPath: "FF7_Disc2.chd",
            path: `/roms/psx/FF7/FF7_Disc2.chd`,
            filename: "FF7_Disc2.chd",
            size: 499999800,
            role: "disc",
        },
    ]);

    await db.insert(scannedFiles).values([
        {
            id: fileId1,
            filename: "FF7.m3u",
            path: `/roms/psx/FF7/FF7.m3u`,
            size: 200,
            ignored: false,
            setId,
            setType: "m3u",
            role: "launch",
        },
        {
            id: fileId2,
            filename: "FF7_Disc1.chd",
            path: `/roms/psx/FF7/FF7_Disc1.chd`,
            size: 500000000,
            ignored: false,
            setId,
            setType: "m3u",
            role: "disc",
        },
        {
            id: fileId3,
            filename: "FF7_Disc2.chd",
            path: `/roms/psx/FF7/FF7_Disc2.chd`,
            size: 499999800,
            ignored: false,
            setId,
            setType: "m3u",
            role: "disc",
        },
    ]);

    try {
        const req = new Request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scannedFileIds: [fileId1, fileId2, fileId3],
                systemId: testSysId,
                gameData: {
                    title: testTitle,
                    year: "1997",
                },
            }),
        });

        const res = await importRouter.request(req);
        assertEquals(res.status, 200);
        const result = await res.json();
        assertEquals(result.status, "success");

        // Verify a single rom set was created in roms
        const importedRoms = await db.select().from(roms).where(eq(roms.systemId, testSysId));
        assertEquals(importedRoms.length, 1);
        const importedSet = importedRoms[0];
        assertEquals(importedSet.setType, "m3u");
        assertEquals(importedSet.launchFile, "FF7.m3u");

        // Verify rom_files has all 3 member files
        const importedFiles = await db.select().from(romFiles).where(eq(romFiles.romId, importedSet.id));
        assertEquals(importedFiles.length, 3);

        // Verify staging tables were cleaned up
        const remainingSet = await db.select().from(scannedSets).where(eq(scannedSets.id, setId)).get();
        assertEquals(remainingSet, undefined);
        const remainingSetFiles = await db.select().from(scannedSetFiles).where(eq(scannedSetFiles.setId, setId));
        assertEquals(remainingSetFiles.length, 0);
    } finally {
        const importedRoms = await db.select().from(roms).where(eq(roms.systemId, testSysId));
        for (const r of importedRoms) {
            await db.delete(romFiles).where(eq(romFiles.romId, r.id));
        }
        await db.delete(roms).where(eq(roms.systemId, testSysId));
        await db.delete(systems).where(eq(systems.id, testSysId));
    }
});



