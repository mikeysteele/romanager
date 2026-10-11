import { assertEquals } from "@std/assert";
import { createSettingsRouter } from "../../../apps/api/src/routes/settings.ts";

Deno.test("GET / should return settings", async () => {
    // Mock worker
    const worker = {} as Worker;
    const router = createSettingsRouter(worker);
    
    const req = new Request("http://localhost/");
    const res = await router.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
});

Deno.test("POST / should update setting", async () => {
    // Mock worker
    let messageSent = false;
    const worker = {
        postMessage: () => { messageSent = true; }
    } as unknown as Worker;
    const router = createSettingsRouter(worker);
    
    const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "roms_dir", value: "/tmp/newdir" }),
    });
    const res = await router.request(req);
    assertEquals(res.status, 200);
    assertEquals(messageSent, true);
});
