import "./setup.ts";
import { assertEquals, assertExists } from "@std/assert";
import "../../../apps/ui/src/components/app-unmapped/app-unmapped.ts";
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

Deno.test("AppUnmapped: review button opens HTML dialog", async () => {
    const originalFetch = globalThis.fetch;
    const testFiles = [{ id: "1", filename: "mario.nes", path: "/roms/mario.nes", size: 1048576 }];
    globalThis.fetch = (url: string | URL | Request) => {
        if (url.toString().includes("/api/unmapped")) {
            return Promise.resolve(new Response(JSON.stringify(testFiles), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    };
    
    const el = document.createElement('app-unmapped') as AppUnmapped;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;
    
    assertEquals(el.files.length, 1);
    
    // Review the file
    el.handleImportClick(el.files[0]);
    await el.updateComplete;
    
    assertEquals(el.selectedFileForImport?.filename, "mario.nes");
    
    const appImport = el.shadowRoot?.querySelector("app-import") as any;
    assertExists(appImport);
    assertEquals(appImport.selectedFile?.filename, "mario.nes");
    
    await appImport.updateComplete;
    const dialog = appImport.shadowRoot?.querySelector("dialog") as HTMLDialogElement;
    assertExists(dialog);
    assertEquals(dialog.open, true);
    assertEquals(dialog.classList.contains("import-dialog"), true);
    
    // Test cancel closes dialog and clears state
    el.handleImportCancel();
    await el.updateComplete;
    await appImport.updateComplete;
    
    assertEquals(el.selectedFileForImport, null);
    assertEquals(appImport.selectedFile, null);
    assertEquals(dialog.open, false);
    
    globalThis.fetch = originalFetch;
    document.body.removeChild(el);
});

Deno.test("AppUnmapped: Group & Review opens import dialog with multiple files", async () => {
    const originalFetch = globalThis.fetch;
    const testFiles = [
        { id: "1", filename: "Final Fantasy VII (Disc 1).bin", path: "/roms/psx/FF7 (Disc 1).bin", size: 600000000 },
        { id: "2", filename: "Final Fantasy VII (Disc 2).bin", path: "/roms/psx/FF7 (Disc 2).bin", size: 600000000 },
        { id: "3", filename: "Zelda.nes", path: "/roms/nes/Zelda.nes", size: 100000 },
    ];
    globalThis.fetch = (url: string | URL | Request) => {
        if (url.toString().includes("/api/unmapped")) {
            return Promise.resolve(new Response(JSON.stringify(testFiles), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    };

    const el = document.createElement('app-unmapped') as AppUnmapped;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;

    // Select 2 files
    el.selectedIds = ["1", "2"];
    el.requestUpdate();
    await el.updateComplete;

    // Check Group & Review button is visible
    const buttons = Array.from(el.shadowRoot?.querySelectorAll("ui-button") || []);
    const groupBtn = buttons.find(b => b.textContent?.includes("Group & Review"));
    assertExists(groupBtn);
    assertEquals(groupBtn.textContent?.includes("2"), true);

    // Click Group & Review
    el.handleGroupReview();
    await el.updateComplete;

    const appImport = el.shadowRoot?.querySelector("app-import") as any;
    assertExists(appImport);
    assertEquals(appImport.selectedFiles.length, 2);

    await appImport.updateComplete;
    const dialog = appImport.shadowRoot?.querySelector("dialog") as HTMLDialogElement;
    assertExists(dialog);
    assertEquals(dialog.open, true);
    const title = appImport.shadowRoot?.querySelector(".dialog-header h2");
    assertEquals(title?.textContent?.includes("Import Group (2 files)"), true);

    globalThis.fetch = originalFetch;
    document.body.removeChild(el);
});

