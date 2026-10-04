import { assertEquals } from "jsr:@std/assert";
import { romsRouter } from "../../../apps/api/src/routes/roms.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { roms, games, systems } from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";

Deno.test("GET / should return active roms", async () => {
    const req = new Request("http://localhost/");
    const res = await romsRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
});

Deno.test("DELETE /:id should mark rom as pendingDelete", async () => {
    const sysId = "test-system-roms-del";
    const gameId = "test-game-roms-del";
    const dummyId = "test-delete-rom-" + Date.now();

    // foreign key prep
    await db.insert(systems).values({ id: sysId, name: "Sys", slug: "sys" }).onConflictDoNothing();
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
