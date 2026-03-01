import "./setup.ts";
import { assertEquals, assertExists } from "@std/assert";
import type { AppUnmapped } from "../../../apps/ui/src/components/app-unmapped/app-unmapped.ts";

Deno.test("AppUnmapped: fetches unmapped files on load", async () => {
    const fetchedUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (url: string | URL | Request) => {
        fetchedUrls.push(url.toString());
        if (url.toString() === "/api/systems") {
            return Promise.resolve(new Response(JSON.stringify([{ id: "sys1", name: "System 1" }]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify([
            { id: "1", filename: "mario.nes", path: "/roms/mario.nes", size: 1048576 }
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    };

    // Ensure JSDOM is setup before loading Lit elements
    await import("../../../apps/ui/src/components/app-unmapped/app-unmapped.ts");
    
    const el = document.createElement('app-unmapped') as AppUnmapped;
    document.body.appendChild(el);
    await el.updateComplete;
    
    // Wait for the async fetch to finish and component to re-render
    await new Promise(r => setTimeout(r, 150));
    el.requestUpdate();
    await el.updateComplete;

    assertEquals(fetchedUrls.includes("/api/unmapped"), true);
    assertExists(el.shadowRoot?.querySelector("data-table"));
    
    globalThis.fetch = originalFetch;
    document.body.removeChild(el);
});

Deno.test("AppUnmapped: review button opens modal", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve(new Response(JSON.stringify([])));
    
    // We already know JSDOM is setup from the previous test
    const el = document.createElement('app-unmapped') as AppUnmapped;
    document.body.appendChild(el);
    await el.updateComplete;
    
    // Simulate setting files
    el.files = [{ id: "1", filename: "mario.nes", path: "/roms/mario.nes", size: 1048576 }];
    await el.updateComplete;
    
    // Call the function directly (since shadow DOM tests are flaky for clicks in JSDOM)
    el.handleImportClick(el.files[0]);
    await el.updateComplete;
    
    assertEquals(el.selectedFileForImport?.filename, "mario.nes");
    assertExists(el.shadowRoot?.querySelector("app-import"));
    
    // Test cancel clears it
    el.handleImportCancel();
    await el.updateComplete;
    
    assertEquals(el.selectedFileForImport, null);
    
    globalThis.fetch = originalFetch;
    document.body.removeChild(el);
});
