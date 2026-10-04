import "./setup.ts";
import { assertEquals } from "jsr:@std/assert@^0.217.0";
import "../../../packages/ui-components/src/ui-folder-browser/ui-folder-browser.ts";
import type { UiFolderBrowser } from "../../../packages/ui-components/src/ui-folder-browser/ui-folder-browser.ts";

function mockBrowseFetch(responsePath = "/home/roms", subdirs = ["nes", "snes", "genesis"]) {
    (globalThis as any).fetch = (url: string) => {
        if (url.includes("/api/filesystem/browse")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    currentPath: responsePath,
                    parentPath: "/home",
                    directories: subdirs.map(d => ({ name: d, path: `${responsePath}/${d}` })),
                    shortcuts: [
                        { label: "Home (~)", path: "/home" },
                        { label: "Root (/)", path: "/" }
                    ]
                })
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    };
}

Deno.test("UiFolderBrowser: does not render modal when closed", async () => {
    mockBrowseFetch();
    const el = document.createElement("ui-folder-browser") as UiFolderBrowser;
    document.body.appendChild(el);
    await el.updateComplete;

    const overlay = el.shadowRoot?.querySelector(".modal-overlay");
    assertEquals(overlay, null);

    document.body.removeChild(el);
});

Deno.test("UiFolderBrowser: renders modal and loads directories when open is true", async () => {
    mockBrowseFetch("/games/library", ["arcade", "gba", "psx"]);
    const el = document.createElement("ui-folder-browser") as UiFolderBrowser;
    el.open = true;
    el.initialPath = "/games/library";
    document.body.appendChild(el);
    await el.updateComplete;
    // Wait for async fetch
    await new Promise(r => setTimeout(r, 20));
    await el.updateComplete;

    const overlay = el.shadowRoot?.querySelector(".modal-overlay");
    assertEquals(!!overlay, true);

    const title = el.shadowRoot?.querySelector(".header-title")?.textContent?.trim();
    assertEquals(title?.includes("Select Directory"), true);

    const shortcuts = el.shadowRoot?.querySelectorAll(".shortcut-chip");
    assertEquals(shortcuts?.length, 2);

    const folders = el.shadowRoot?.querySelectorAll(".folder-item");
    assertEquals(folders?.length, 3);

    document.body.removeChild(el);
});

Deno.test("UiFolderBrowser: selecting folder dispatches folder-selected and closes", async () => {
    mockBrowseFetch("/games/library", ["arcade", "gba"]);
    const el = document.createElement("ui-folder-browser") as UiFolderBrowser;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 20));
    await el.updateComplete;

    // Click on the first folder item ("arcade")
    const folders = el.shadowRoot?.querySelectorAll(".folder-item");
    assertEquals(folders?.length, 2);
    (folders?.[0] as HTMLElement).click();
    await el.updateComplete;

    assertEquals(el.selectedPath, "/games/library/arcade");

    let selectedEventDetail: any = null;
    let closeFired = false;
    el.addEventListener("folder-selected", (e: any) => {
        selectedEventDetail = e.detail;
    });
    el.addEventListener("ui-folder-browser-close", () => {
        closeFired = true;
    });

    // Click "Select This Folder" button
    const selectBtn = el.shadowRoot?.querySelector(".footer-actions ui-button[variant='primary']") as any;
    assertEquals(!!selectBtn, true);
    el.handleSelectFolder();

    assertEquals(selectedEventDetail?.path, "/games/library/arcade");
    assertEquals(closeFired, true);
    assertEquals(el.open, false);

    document.body.removeChild(el);
});

Deno.test("UiFolderBrowser: closing modal dispatches ui-folder-browser-close", async () => {
    mockBrowseFetch();
    const el = document.createElement("ui-folder-browser") as UiFolderBrowser;
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;

    let closeFired = false;
    el.addEventListener("ui-folder-browser-close", () => {
        closeFired = true;
    });

    const closeBtn = el.shadowRoot?.querySelector(".close-btn") as HTMLButtonElement;
    assertEquals(!!closeBtn, true);
    closeBtn.click();

    assertEquals(closeFired, true);
    assertEquals(el.open, false);

    document.body.removeChild(el);
});
