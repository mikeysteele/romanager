import "./setup.ts";
import { assertEquals } from "@std/assert";
import "../../../apps/ui/src/components/app-game-detail/app-game-detail.ts";
import type { AppGameDetail } from "../../../apps/ui/src/components/app-game-detail/app-game-detail.ts";

Deno.test("AppGameDetail: fetches game by routing params", async () => {
    let fetchedUrl = "";
    globalThis.fetch = ((url: string) => {
        fetchedUrl = url;
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ 
                id: "1",
                slug: "super-mario-world",
                name: "Super Mario World", 
                platforms: [{
                    id: "snes-1",
                    slug: "snes",
                    name: "Super Nintendo",
                    roms: [{ id: "r1", systemId: "snes", path: "/roms/smw.sfc", filename: "smw.sfc", size: 1024 }] 
                }]
            }])
        });
    }) as unknown as typeof fetch;

    const el = document.createElement("app-game-detail") as AppGameDetail;
    el.gameSlug = "super-mario-world";
    
    document.body.appendChild(el);
    await el.updateComplete;
    
    // Wait for the async fetch to finish and component to re-render
    await new Promise(r => setTimeout(r, 150));
    el.requestUpdate();
    await el.updateComplete;

    assertEquals(fetchedUrl, "/api/games?slug=super-mario-world");
    assertEquals(el.game?.name, "Super Mario World");

    const header = el.shadowRoot!.querySelector("h1");
    assertEquals(header?.textContent, "Super Mario World");
    
    // Verify ROM exists
    const romItem = el.shadowRoot!.querySelector(".filename");
    assertEquals(romItem?.textContent?.includes("smw.sfc"), true);

    // Verify Delete button renders
    const deleteBtn = el.shadowRoot!.querySelector("ui-button[variant='error']");
    assertEquals(deleteBtn?.textContent?.includes("Delete"), true);

    document.body.removeChild(el);
});
