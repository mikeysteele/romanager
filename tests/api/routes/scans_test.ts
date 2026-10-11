import { assertEquals } from "@std/assert";
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

Deno.test("POST / should dispatch scan command to worker", async () => {
    let postedMessage: {command?: string, path?: string, force?: boolean} = {} ;
    const mockWorker = {
        postMessage(msg: typeof postedMessage) {
            postedMessage = msg;
        }
    } as unknown as Worker;

    const router = createScansRouter(mockWorker, "/default/roms");
    
    // 1. POST with explicit path
    const req1 = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/custom/path" }),
    });
    const res1 = await router.request(req1);
    assertEquals(res1.status, 200);
    const json1 = await res1.json();
    assertEquals(json1.status, "started");
    assertEquals(postedMessage, { command: "scan", path: "/custom/path" });

    // 2. POST without path uses fallback
    const req2 = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    const res2 = await router.request(req2);
    assertEquals(res2.status, 200);
    const json2 = await res2.json();
    assertEquals(json2.status, "started");
    assertEquals(postedMessage?.command, "scan");
});
