import { assertEquals } from "@repo/tests/utils/assert";
import process from "node:process";
import { metadataRouter } from "../../../apps/api/src/routes/metadata.ts";
import { GameSchema, PlatformSchema } from "@repo/shared";
import { z } from "zod";

test("metadataRouter: GET /search handles empty query", async () => {
    const req = new Request("http://localhost/search");
    const res = await metadataRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json, []);
});

test("metadataRouter: GET /search without API key returns empty array safely", async () => {
    const origKey = process.env.RAWG_API_KEY;
    try {
        delete process.env.RAWG_API_KEY;
        const req = new Request("http://localhost/search?q=chrono");
        const res = await metadataRouter.request(req);
        assertEquals(res.status, 200);
        const json = await res.json();
        assertEquals(json, []);
    } finally {
        if (origKey !== undefined) process.env.RAWG_API_KEY = origKey;
        else delete process.env.RAWG_API_KEY;
    }
});

test("metadataRouter: GET /search with mocked RAWG returns GameSchema contract", async () => {
    const origKey = process.env.RAWG_API_KEY;
    const origFetch = globalThis.fetch;
    try {
        process.env.RAWG_API_KEY = "dummy-test-key";
        globalThis.fetch = ((input: RequestInfo | URL) => {
            const urlStr = String(input);
            if (urlStr.includes("api.rawg.io/api/games")) {
                return Promise.resolve(new Response(JSON.stringify({
                    count: 1,
                    results: [{
                        id: 1234,
                        slug: "chrono-trigger",
                        name: "Chrono Trigger",
                        description_raw: "A classic RPG",
                        background_image: "https://example.com/ct.jpg",
                        platforms: [{ platform: { id: 79, slug: "snes", name: "SNES" } }],
                        genres: [{ name: "RPG" }],
                        developers: [{ name: "Square" }],
                        publishers: [{ name: "Square" }],
                        released: "1995-03-11"
                    }]
                }), { status: 200, headers: { "Content-Type": "application/json" } }));
            }
            return origFetch(input);
        }) as typeof fetch;

        const req = new Request("http://localhost/search?q=chrono");
        const res = await metadataRouter.request(req);
        assertEquals(res.status, 200);
        const json = await res.json();
        const games = z.array(GameSchema).parse(json);
        assertEquals(games.length, 1);
        assertEquals(games[0].name, "Chrono Trigger");
        assertEquals(games[0].slug, "chrono-trigger");
    } finally {
        globalThis.fetch = origFetch;
        if (origKey !== undefined) process.env.RAWG_API_KEY = origKey;
        else delete process.env.RAWG_API_KEY;
    }
});

test("metadataRouter: GET /platforms with mocked RAWG returns PlatformSchema contract", async () => {
    const origKey = process.env.RAWG_API_KEY;
    const origFetch = globalThis.fetch;
    try {
        process.env.RAWG_API_KEY = "dummy-test-key";
        globalThis.fetch = ((input: RequestInfo | URL) => {
            const urlStr = String(input);
            if (urlStr.includes("api.rawg.io/api/platforms")) {
                return Promise.resolve(new Response(JSON.stringify({
                    count: 2,
                    results: [
                        { id: 79, name: "SNES", slug: "snes", games_count: 100, image_background: "" },
                        { id: 49, name: "NES", slug: "nes", games_count: 200, image_background: "" }
                    ]
                }), { status: 200, headers: { "Content-Type": "application/json" } }));
            }
            return origFetch(input);
        }) as typeof fetch;

        const req = new Request("http://localhost/platforms");
        const res = await metadataRouter.request(req);
        assertEquals(res.status, 200);
        const json = await res.json();
        const platforms = z.array(PlatformSchema).parse(json);
        assertEquals(platforms.length, 2);
        assertEquals(platforms[0].slug, "snes");
        assertEquals(platforms[1].slug, "nes");
    } finally {
        globalThis.fetch = origFetch;
        if (origKey !== undefined) process.env.RAWG_API_KEY = origKey;
        else delete process.env.RAWG_API_KEY;
    }
});
