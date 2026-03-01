import { assertEquals } from "jsr:@std/assert";
import { systemsRouter } from "../../../apps/api/src/routes/systems.ts";

Deno.test("GET / should return systems", async () => {
    const req = new Request("http://localhost/");
    const res = await systemsRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
});

Deno.test("GET /:slug should handle not found", async () => {
    const req = new Request("http://localhost/not-a-real-system");
    const res = await systemsRouter.request(req);
    assertEquals(res.status, 404);
});
