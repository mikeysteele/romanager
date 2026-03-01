import { assertEquals } from "jsr:@std/assert";
import { metadataRouter } from "../../../apps/api/src/routes/metadata.ts";

Deno.test("GET /search should handle empty query", async () => {
    const req = new Request("http://localhost/search");
    const res = await metadataRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json, []);
});
