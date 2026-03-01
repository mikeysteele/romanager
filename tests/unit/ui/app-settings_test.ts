import "./setup.ts";
import { assertEquals } from "jsr:@std/assert";
import "../../../apps/ui/src/components/app-settings/app-settings.ts";
import type { AppSettings } from "../../../apps/ui/src/components/app-settings/app-settings.ts";

Deno.test("AppSettings: fetches settings on load", async () => {
    let fetchedUrl = "";
    (globalThis as any).fetch = (url: string) => {
        fetchedUrl = url;
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ key: "roms_dir", value: "/my/roms" }])
        });
    };

    const el = document.createElement("app-settings") as AppSettings;
    document.body.appendChild(el);
    await el.updateComplete;
    
    // Wait for the async fetch to finish
    await new Promise(r => setTimeout(r, 10));

    assertEquals(fetchedUrl, "/api/settings");
    assertEquals(el.romsDir, "/my/roms");
    document.body.removeChild(el);
});

Deno.test("AppSettings: saves settings on submit", async () => {
    let postOptions: any;
    (globalThis as any).fetch = (url: string, options: any) => {
        if (options && options.method === 'POST') {
             postOptions = options;
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    };

    const el = document.createElement("app-settings") as AppSettings;
    el.romsDir = "/new/dir";
    
    // Mock the alert so it doesn't pause/fail test logs
    (globalThis as any).alert = () => {};
    
    await el.saveSettings(new Event("submit"));

    assertEquals(postOptions.body, JSON.stringify({ key: "roms_dir", value: "/new/dir" }));
});
