import "./setup.ts";
import { assertEquals, assertExists } from "jsr:@std/assert@^0.217.0";
import "../../../apps/ui/src/components/app-emulator/app-emulator.ts";
import type { AppEmulator } from "../../../apps/ui/src/components/app-emulator/app-emulator.ts";

Deno.test("AppEmulator: fetches rom data and displays toolbar", async () => {
    let fetchedUrl = "";
    (globalThis as any).fetch = (url: string) => {
        fetchedUrl = url;
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: "123", filename: "mario.nes", platform: "nes" })
        });
    };

    const el = document.createElement("app-emulator") as AppEmulator;
    el.gameId = "123";

    document.body.appendChild(el);
    await el.updateComplete;
    
    // Wait for the async fetch to finish and component to re-render
    await new Promise(r => setTimeout(r, 150));
    el.requestUpdate();
    await el.updateComplete;

    assertEquals(fetchedUrl, "/api/roms/123");
    assertEquals(el.rom?.filename, "mario.nes");

    const toolbar = el.shadowRoot!.querySelector(".toolbar");
    assertExists(toolbar);
    assertEquals(toolbar.textContent?.includes("mario.nes"), true);

    document.body.removeChild(el);
});
