import "./setup.ts";
import { assertEquals } from "jsr:@std/assert";
import "../../../apps/ui/src/components/app-library/app-library.ts";
import type { AppLibrary } from "../../../apps/ui/src/components/app-library/app-library.ts";

Deno.test("AppLibrary: fetches all games on load", async () => {
    let fetchedUrl = "";
    (globalThis as any).fetch = (url: string) => {
        fetchedUrl = url;
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: "1", name: "Super Mario" }])
        });
    };

    const el = document.createElement("app-library") as AppLibrary;
    document.body.appendChild(el);
    await el.updateComplete;
    
    // Wait for the async fetch to finish
    await new Promise(r => setTimeout(r, 10));

    assertEquals(fetchedUrl, "/api/games");
    assertEquals(el.games.length, 1);
    assertEquals(el.games[0].name, "Super Mario");
    document.body.removeChild(el);
});

Deno.test("AppLibrary: filters games locally", async () => {
    const el = document.createElement("app-library") as AppLibrary;
    el.games = [
        { id: "1", name: "Super Mario World", slug: "" } as any,
        { id: "2", name: "Zelda A Link to the Past", slug: "" } as any,
        { id: "3", name: "Zelda Ocarina of Time", slug: "" } as any,
    ];

    el.filterQuery = "zelda";
    
    const filtered = el.filteredGames;
    assertEquals(filtered.length, 2);
    assertEquals(filtered[0].id, "2");
    assertEquals(filtered[1].id, "3");
});
