import { assertEquals } from "jsr:@std/assert";
import { gamesRouter } from "../../../apps/api/src/routes/games.ts";

Deno.test("GET / should return games", async () => {
    const req = new Request("http://localhost/");
    const res = await gamesRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
});

Deno.test("POST /add should require title and systemId", async () => {
    const req = new Request("http://localhost/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    const res = await gamesRouter.request(req);
    assertEquals(res.status, 400);
});
