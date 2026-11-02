import "./setup.ts";
import { assertEquals, assertExists } from "@repo/tests/utils/assert";
import "../../../apps/ui/src/components/app-root/app-root.ts";
import type { AppRoot } from "../../../apps/ui/src/components/app-root/app-root.ts";

test("AppRoot: renders layout components", async () => {
    // Mock EventSource
    class MockEventSource {
        onmessage: ((ev: MessageEvent) => void) | null = null;
        constructor() {}
    }
    (globalThis as unknown as { EventSource: unknown }).EventSource = MockEventSource;

    const el = document.createElement("app-root") as AppRoot;
    document.body.appendChild(el);
    await el.updateComplete;

    const header = el.shadowRoot!.querySelector("app-header");
    const sidebar = el.shadowRoot!.querySelector("app-sidebar");
    const main = el.shadowRoot!.querySelector("main");

    assertExists(header);
    assertExists(sidebar);
    assertExists(main);

    document.body.removeChild(el);
});

test("AppRoot: handleMessageData routes SSE actions without phantom scan-done events", () => {
    const el = document.createElement("app-root") as AppRoot;
    const events: string[] = [];
    const onRomsUpdated = () => events.push("roms-updated");
    const onScanDone = () => events.push("scan-done");
    const onPlatformsUpdated = () => events.push("platforms-updated");

    globalThis.addEventListener("roms-updated", onRomsUpdated);
    globalThis.addEventListener("scan-done", onScanDone);
    globalThis.addEventListener("platforms-updated", onPlatformsUpdated);

    try {
        el.handleMessageData(JSON.stringify({ type: "done", action: "roms-updated" }));
        assertEquals(events, ["roms-updated"]);

        events.length = 0;
        el.handleMessageData(JSON.stringify({ type: "done", action: "game-added" }));
        assertEquals(events, ["platforms-updated", "roms-updated"]);

        events.length = 0;
        el.handleMessageData(JSON.stringify({ type: "done", count: 3 }));
        assertEquals(events, ["scan-done", "roms-updated"]);
    } finally {
        globalThis.removeEventListener("roms-updated", onRomsUpdated);
        globalThis.removeEventListener("scan-done", onScanDone);
        globalThis.removeEventListener("platforms-updated", onPlatformsUpdated);
    }
});

