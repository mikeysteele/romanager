import "./setup.ts";
import { assertExists } from "@repo/tests/utils/assert";
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
