import { assertEquals } from "jsr:@std/assert";
import { createScansRouter } from "../../../apps/api/src/routes/scans.ts";

Deno.test("GET / should return scans list", async () => {
    // Mock worker
    const worker = {} as Worker;
    const router = createScansRouter(worker, "/tmp");
    
    const req = new Request("http://localhost/");
    const res = await router.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
});
