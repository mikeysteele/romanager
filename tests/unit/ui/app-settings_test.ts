import "./setup.ts";
import { assertEquals } from "jsr:@std/assert";
import "../../../apps/ui/src/components/app-settings-roms/app-settings-roms.ts";
import type { AppSettingsRoms } from "../../../apps/ui/src/components/app-settings-roms/app-settings-roms.ts";

Deno.test("AppSettingsRoms: fetches settings on load", async () => {
    let fetchedSettings = false;
    (globalThis as any).fetch = (url: string) => {
        if (url === "/api/settings") {
            fetchedSettings = true;
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([{ key: "roms_dir", value: "/my/roms" }])
            });
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
        });
    };

    const el = document.createElement("app-settings-roms") as AppSettingsRoms;
    document.body.appendChild(el);
    await el.updateComplete;
    
    // Wait for the async fetch to finish
    await new Promise(r => setTimeout(r, 20));

    assertEquals(fetchedSettings, true);
    assertEquals(el.romsDir, "/my/roms");
    document.body.removeChild(el);
});

Deno.test("AppSettingsRoms: saves settings on submit", async () => {
    let postOptions: RequestInit = {};
    globalThis.fetch = (_url, options) => {
        if (options && options.method === 'POST') {
             postOptions = options;
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
    };

    const el = document.createElement("app-settings-roms") as AppSettingsRoms;
    el.romsDir = "/new/dir";
    
    // Mock the alert so it doesn't pause/fail test logs
    globalThis.alert = () => {};
    
    await el.saveSettings(new Event("submit"));

    assertEquals(postOptions.body, JSON.stringify({ key: "roms_dir", value: "/new/dir" }));
});

Deno.test("AppSettingsRoms: clicking browse button opens folder browser", async () => {
    globalThis.fetch = (url, _options) => {
        const urlString = url instanceof Request? url.url : url.toString();
       
        if (urlString.startsWith('/api/filesystem/browse')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    currentPath: "/games/roms",
                    parentPath: "/games",
                    directories: [{ name: "snes", path: "/games/roms/snes" }],
                    shortcuts: [{ label: "Home", path: "/home" }]
                })
            } as Response);
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
        } as Response);
    };

    const el = document.createElement("app-settings-roms") as AppSettingsRoms;
    document.body.appendChild(el);
    await el.updateComplete;

    assertEquals(el.isBrowserOpen, false);
    
    const browseBtn = el.shadowRoot?.querySelector(".browse-btn") as HTMLButtonElement;
    assertEquals(!!browseBtn, true);

    browseBtn.click();
    await el.updateComplete;

    assertEquals(el.isBrowserOpen, true);

    const folderBrowser = el.shadowRoot?.querySelector("ui-folder-browser") as any;
    assertEquals(!!folderBrowser, true);
    assertEquals(folderBrowser.open, true);

    await folderBrowser.updateComplete;
    const modalOverlay = folderBrowser.shadowRoot?.querySelector(".modal-overlay");
    assertEquals(!!modalOverlay, true);

    // Simulate folder selected event
    folderBrowser.dispatchEvent(new CustomEvent("folder-selected", {
        detail: { path: "/games/roms/snes" },
        bubbles: true,
        composed: true
    }));
    await el.updateComplete;

    assertEquals(el.romsDir, "/games/roms/snes");
    assertEquals(el.isBrowserOpen, false);

    // Verify closing via close event
    browseBtn.click();
    await el.updateComplete;
    assertEquals(el.isBrowserOpen, true);

    folderBrowser.dispatchEvent(new CustomEvent("ui-folder-browser-close", {
        bubbles: true,
        composed: true
    }));
    await el.updateComplete;
    assertEquals(el.isBrowserOpen, false);

    document.body.removeChild(el);
});


