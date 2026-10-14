import "./setup.ts";
import { assertEquals } from "@repo/tests/utils/assert";
import "../../../apps/ui/src/components/app-import/app-import.ts";
import { AppImport } from "../../../apps/ui/src/components/app-import/app-import.ts";

test("AppImport: setting selectedFile triggers search setup", () => {
    const component = new AppImport();
    
    // Test direct setup
    component.prepareSearchForFile({ id: "1", filename: "Super Mario (USA).nes", path: "/roms/mario.nes", size: 1024 });
    assertEquals(component.searchQuery, "Super Mario");
});

test("AppImport: closeModal resets state", () => {
    const component = new AppImport();
    component.selectedFile = { id: "1", filename: "test", path: "test", size: 1 };
    component.selectedGame = { identifier: "1", title: "test" };
    component.searchQuery = "foo";

    component.closeModal();

    assertEquals(component.selectedFile, null);
    assertEquals(component.selectedGame, null);
    assertEquals(component.searchQuery, "");
});

test("AppImport: renders HTML dialog and opens when selectedFile is set", async () => {
    const el = document.createElement("app-import") as AppImport;
    document.body.appendChild(el);
    await el.updateComplete;

    const dialog = el.shadowRoot?.querySelector("dialog") as HTMLDialogElement;
    assertEquals(!!dialog, true);
    assertEquals(dialog.open, false);

    // Set selected file
    el.selectedFile = { id: "1", filename: "Chrono Trigger.sfc", path: "/roms/sfc/chrono.sfc", size: 4194304 };
    await el.updateComplete;

    assertEquals(dialog.open, true);
    const title = el.shadowRoot?.querySelector(".dialog-header h2");
    assertEquals(title?.textContent?.includes("Chrono Trigger.sfc"), true);

    // Close modal
    el.closeModal();
    await el.updateComplete;

    assertEquals(dialog.open, false);
    assertEquals(el.selectedFile, null);

    document.body.removeChild(el);
});

test("AppImport: handleSearch parses RAWG search results with normalized platform objects", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (url: string | URL | Request) => {
        if (url.toString().includes("/api/metadata/search")) {
            return Promise.resolve(new Response(JSON.stringify([
                {
                    id: 3498,
                    name: "Grand Theft Auto V",
                    released: "2013-09-17",
                    backgroundImage: "https://example.com/gta5.jpg",
                    platforms: [
                        { id: "4", name: "PC", slug: "pc" },
                        { id: "187", name: "PlayStation 5", slug: "playstation5" }
                    ]
                }
            ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    };

    const component = new AppImport();
    component.searchQuery = "Grand Theft Auto V";
    await component.handleSearch();

    assertEquals(component.searchResults.length, 1);
    assertEquals(component.searchResults[0].title, "Grand Theft Auto V");
    assertEquals(component.searchResults[0].year, "2013");
    assertEquals(component.searchResults[0].platforms?.length, 2);
    assertEquals(component.searchResults[0].platforms?.[0].name, "PC");

    globalThis.fetch = originalFetch;
});

test("AppImport: renders multiple grouped files in dialog", async () => {
    const el = document.createElement("app-import") as AppImport;
    document.body.appendChild(el);
    await el.updateComplete;

    el.selectedFiles = [
        { id: "1", filename: "Resident Evil.cue", path: "/roms/psx/Resident Evil.cue", size: 120 },
        { id: "2", filename: "Resident Evil.bin", path: "/roms/psx/Resident Evil.bin", size: 650000000 },
    ];
    await el.updateComplete;

    const dialog = el.shadowRoot?.querySelector("dialog") as HTMLDialogElement;
    assertEquals(dialog.open, true);

    const title = el.shadowRoot?.querySelector(".dialog-header h2");
    assertEquals(title?.textContent?.includes("Import Group (2 files)"), true);

    const fileItems = el.shadowRoot?.querySelectorAll(".group-file-item");
    assertEquals(fileItems?.length, 2);

    document.body.removeChild(el);
});

test("AppImport: detects companion files and adds to group", async () => {
    const el = document.createElement("app-import") as AppImport;
    document.body.appendChild(el);
    await el.updateComplete;

    el.allUnmappedFiles = [
        { id: "1", filename: "Tomb Raider.cue", path: "/roms/psx/Tomb Raider.cue", size: 150 },
        { id: "2", filename: "Tomb Raider (Track 1).bin", path: "/roms/psx/Tomb Raider (Track 1).bin", size: 400000000 },
        { id: "3", filename: "Tomb Raider (Track 2).bin", path: "/roms/psx/Tomb Raider (Track 2).bin", size: 50000000 },
        { id: "4", filename: "Super Mario.nes", path: "/roms/nes/Super Mario.nes", size: 40960 },
    ];

    el.selectedFiles = [
        { id: "1", filename: "Tomb Raider.cue", path: "/roms/psx/Tomb Raider.cue", size: 150 }
    ];
    await el.updateComplete;

    // Companions should suggest Track 1 and Track 2, but not Super Mario
    assertEquals(el.suggestedCompanions.length, 2);
    assertEquals(el.suggestedCompanions.some(c => c.filename.includes("Track 1")), true);
    assertEquals(el.suggestedCompanions.some(c => c.filename.includes("Track 2")), true);

    // Add Track 1 to group
    el.addFileToGroup(el.suggestedCompanions[0]);
    await el.updateComplete;

    assertEquals(el.groupedFiles.length, 2);
    assertEquals(el.suggestedCompanions.length, 1);

    document.body.removeChild(el);
});

