import "./setup.ts";
import { assertEquals, assertExists } from "jsr:@std/assert";
import "../../../apps/ui/src/components/app-root/app-root.ts";
import type { AppRoot } from "../../../apps/ui/src/components/app-root/app-root.ts";

Deno.test("AppRoot: renders layout components", async () => {
    // Mock EventSource
    class MockEventSource {
        onmessage: any;
        constructor() {}
    }
    (globalThis as any).EventSource = MockEventSource;

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
