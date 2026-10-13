import "./setup.ts";
import { assertEquals } from "@repo/tests/utils/assert";
import "../../../apps/ui/src/components/app-system-detail/app-system-detail.ts";
import type { AppSystemDetail } from "../../../apps/ui/src/components/app-system-detail/app-system-detail.ts";

test("AppSystemDetail: fetches system and games by slug", async () => {
    let fetchedUrl = "";
    (globalThis as unknown as { fetch: unknown }).fetch = (url: string) => {
        fetchedUrl = url;
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
                id: "sys-snes",
                name: "Super Nintendo",
                slug: "snes",
                path: "/roms/snes",
                games: [
                    { id: "1", name: "Chrono Trigger", slug: "chrono-trigger" },
                    { id: "2", name: "Super Metroid", slug: "super-metroid" }
                ]
            })
        });
    };

    const el = document.createElement("app-system-detail") as AppSystemDetail;
    el.systemSlug = "snes";

    document.body.appendChild(el);
    await el.updateComplete;

    await new Promise(r => setTimeout(r, 100));
    el.requestUpdate();
    await el.updateComplete;

    assertEquals(fetchedUrl, "/api/platforms/snes");
    assertEquals(el.system?.name, "Super Nintendo");
    assertEquals(el.games.length, 2);

    const title = el.shadowRoot!.querySelector("h2");
    assertEquals(title?.textContent, "Super Nintendo");

    // Test filter input
    el.filterQuery = "metroid";
    assertEquals(el.filteredGames.length, 1);
    assertEquals(el.filteredGames[0].name, "Super Metroid");

    document.body.removeChild(el);
});
