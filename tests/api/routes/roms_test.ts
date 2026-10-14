import { assertEquals } from "@repo/tests/utils/assert";
import { romsRouter } from "../../../apps/api/src/routes/roms.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { roms, games, systems } from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";
import { RomSchema } from "@repo/shared";
import { z } from "zod";

test("GET / should return active roms conforming to RomSchema contract", async () => {
    const req = new Request("http://localhost/");
    const res = await romsRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
    z.array(RomSchema).parse(json);
});

test("GET / with limit and offset should support pagination and conform to RomSchema", async () => {
    const req = new Request("http://localhost/?limit=1&offset=0");
    const res = await romsRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
    assertEquals(json.length <= 1, true);
    z.array(RomSchema).parse(json);
});

test("GET /:id should return single rom details conforming to RomSchema", async () => {
    const sysId = "test-system-roms-get";
    const gameId = "test-game-roms-get";
    const romId = "test-get-rom-" + Date.now();

    await db.insert(systems).values({ id: sysId, name: "SysGet", slug: sysId }).onConflictDoNothing();
    await db.insert(games).values({ id: gameId, name: "GameGet", slug: gameId }).onConflictDoNothing();
    await db.insert(roms).values({
        id: romId,
        gameId,
        systemId: sysId,
        filename: "single.rom",
        path: `/tmp/${romId}.rom`,
        size: 2048,
        pendingDelete: false
    });

    try {
        const req = new Request(`http://localhost/${romId}`);
        const res = await romsRouter.request(req);
        assertEquals(res.status, 200);
        const json = await res.json();
        const parsedRom = RomSchema.parse(json);
        assertEquals(parsedRom.id, romId);
        assertEquals(parsedRom.filename, "single.rom");
        assertEquals(parsedRom.platform, "SysGet");
    } finally {
        await db.delete(roms).where(eq(roms.id, romId));
        await db.delete(games).where(eq(games.id, gameId));
        await db.delete(systems).where(eq(systems.id, sysId));
    }
});

test("DELETE /:id should mark rom as pendingDelete", async () => {
    const timestamp = Date.now();
    const sysId = "test-system-roms-del-" + timestamp;
    const gameId = "test-game-roms-del-" + timestamp;
    const dummyId = "test-delete-rom-" + timestamp;

    // foreign key prep
    await db.insert(systems).values({ id: sysId, name: "Sys", slug: "sys-" + timestamp }).onConflictDoNothing();
    await db.insert(games).values({ id: gameId, name: "Game", slug: gameId }).onConflictDoNothing();

    await db.insert(roms).values({
        id: dummyId,
        gameId: gameId,
        systemId: sysId,
        filename: "test.rom",
        path: "/tmp/test.rom",
        size: 1024,
        pendingDelete: false
    });

    const req = new Request(`http://localhost/${dummyId}`, { method: "DELETE" });
    const res = await romsRouter.request(req);
    assertEquals(res.status, 202);

    // Verify row is marked
    const romRecord = await db.select().from(roms).where(eq(roms.id, dummyId)).get();
    assertEquals(romRecord?.pendingDelete, true);
    
    // Wait briefly for deletion worker to finalize
    await new Promise((r) => setTimeout(r, 60));

    // Clean up
    await db.delete(roms).where(eq(roms.id, dummyId));
    await db.delete(games).where(eq(games.id, gameId));
    await db.delete(systems).where(eq(systems.id, sysId));
});
