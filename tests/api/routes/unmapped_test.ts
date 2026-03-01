import { assertEquals } from "@std/assert";
import { unmappedRouter } from "../../../apps/api/src/routes/unmapped.ts";

Deno.test("unmapped router: GET / returns array", async () => {
    const res = await unmappedRouter.request("/");
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(Array.isArray(data), true);
});
