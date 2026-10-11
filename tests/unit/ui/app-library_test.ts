import "./setup.ts";
import { assertEquals } from "@std/assert";
import type { GameRead } from "@repo/shared";
import "../../../apps/ui/src/components/app-library/app-library.ts";
import type { AppLibrary } from "../../../apps/ui/src/components/app-library/app-library.ts";

Deno.test("AppLibrary: fetches all games on load", async () => {
    let fetchedUrl = "";
    globalThis.fetch = ((url: string) => {
        fetchedUrl = url;
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: "1", name: "Super Mario" }])
        });
    }) as unknown as typeof fetch;

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

Deno.test("AppLibrary: filters games locally", () => {
    const el = document.createElement("app-library") as AppLibrary;
    el.games = [
        { id: "1", name: "Super Mario World", slug: "" } as unknown as GameRead,
        { id: "2", name: "Zelda A Link to the Past", slug: "" } as unknown as GameRead,
        { id: "3", name: "Zelda Ocarina of Time", slug: "" } as unknown as GameRead,
    ];

    el.filterQuery = "zelda";
    
    const filtered = el.filteredGames;
    assertEquals(filtered.length, 2);
    assertEquals(filtered[0].id, "2");
    assertEquals(filtered[1].id, "3");
});
