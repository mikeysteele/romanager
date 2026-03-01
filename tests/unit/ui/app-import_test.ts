import "./setup.ts";
import { assertEquals } from "@std/assert";
import "../../../apps/ui/src/components/app-import/app-import.ts";
import { AppImport } from "../../../apps/ui/src/components/app-import/app-import.ts";

Deno.test("AppImport: setting selectedFile triggers search setup", () => {
    const component = new AppImport();
    
    // Test direct setup
    component.prepareSearchForFile({ id: "1", filename: "Super Mario (USA).nes", path: "/roms/mario.nes", size: 1024 });
    assertEquals(component.searchQuery, "Super Mario");
});

Deno.test("AppImport: closeModal resets state", () => {
    const component = new AppImport();
    component.selectedFile = { id: "1", filename: "test", path: "test", size: 1 };
    component.selectedGame = { identifier: "1", title: "test" };
    component.searchQuery = "foo";

    component.closeModal();

    assertEquals(component.selectedFile, null);
    assertEquals(component.selectedGame, null);
    assertEquals(component.searchQuery, "");
});
