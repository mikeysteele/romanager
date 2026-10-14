import "./setup.ts";
import { assertEquals } from "@repo/tests/utils/assert";
import "../../../apps/ui/src/components/app-add-game/app-add-game.ts";
import { AppAddGame } from "../../../apps/ui/src/components/app-add-game/app-add-game.ts";

test("AppAddGame: search fetches results", async () => {
    const component = new AppAddGame();
    component.query = "Sonic";
    
    // Mock fetch
    const mockResults = [{ id: "sonic-1", slug: "sonic-1", name: "Sonic the Hedgehog" }];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (url) => {
        if (url.toString().includes("/api/metadata/search")) {
             return Promise.resolve(new Response(JSON.stringify(mockResults)));
        }
        return Promise.resolve(new Response("[]"));
    };

    const event = new CustomEvent("submit", { detail: { value: "Sonic" } });
    event.preventDefault = () => {};
    
    await component.handleSearch(event);

    assertEquals(component.results.length, 1);
    assertEquals(component.results[0].name, "Sonic the Hedgehog");

    globalThis.fetch = originalFetch;
});
