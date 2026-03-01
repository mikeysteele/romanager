import { assertEquals } from "jsr:@std/assert";
import { importRouter } from "../../../apps/api/src/routes/import.ts";

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
