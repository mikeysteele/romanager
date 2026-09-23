import { assertEquals } from "@std/assert";
import { unmappedRouter } from "../../../apps/api/src/routes/unmapped.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { scannedFiles } from "../../../apps/api/src/db/schema.ts";

Deno.test("unmapped router: GET / returns array", async () => {
    const res = await unmappedRouter.request("/");
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(Array.isArray(data), true);
});

Deno.test("unmapped router: DELETE / clears unmapped files", async () => {
    // Insert a dummy scanned file
    const dummyId = "test-clear-" + Date.now();
    await db.insert(scannedFiles).values({
        id: dummyId,
        path: `/tmp/${dummyId}.rom`,
        filename: `${dummyId}.rom`,
        size: 1234,
        ignored: false,
    });

    // Call DELETE /
    const res = await unmappedRouter.request("/", { method: "DELETE" });
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.success, true);

    // Verify all unmapped files are deleted
    const listRes = await unmappedRouter.request("/");
    const list = await listRes.json();
    assertEquals(list.length, 0);
});

