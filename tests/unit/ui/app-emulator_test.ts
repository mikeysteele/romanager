import "./setup.ts";
import { assertEquals, assertExists } from "@repo/tests/utils/assert";
import "../../../apps/ui/src/components/app-emulator/app-emulator.ts";
import type { AppEmulator } from "../../../apps/ui/src/components/app-emulator/app-emulator.ts";

test("AppEmulator: fetches rom data and displays toolbar", async () => {
    let fetchedUrl = "";
    globalThis.fetch = ((url: string) => {
        fetchedUrl = url;
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: "123", filename: "mario.nes", platform: "nes" })
        });
    }) as unknown as typeof fetch;

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
    assertEquals(el.selectedCore, "fceumm");

    const launchBtn = el.shadowRoot!.querySelector(".btn-launch");
    assertExists(launchBtn);
    assertEquals(launchBtn.textContent?.includes("Launch Game"), true);

    document.body.removeChild(el);
});

test("AppEmulator: shows disabled message when platform emulatable is false", async () => {
    globalThis.fetch = (() => {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                id: "456",
                filename: "god_of_war.iso",
                platform: "PlayStation 2",
                platformSlug: "ps2",
                emulatable: false,
                emulatorCore: null,
            })
        });
    }) as unknown as typeof fetch;

    const el = document.createElement("app-emulator") as AppEmulator;
    el.gameId = "456";

    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 150));
    el.requestUpdate();
    await el.updateComplete;

    const launchBtn = el.shadowRoot!.querySelector(".btn-launch");
    assertEquals(launchBtn, null);
    const overlayText = el.shadowRoot!.querySelector(".crt-overlay")?.textContent || "";
    assertEquals(overlayText.includes("Browser emulation is currently disabled"), true);

    document.body.removeChild(el);
});

