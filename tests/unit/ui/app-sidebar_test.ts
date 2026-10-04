import "./setup.ts";
import { assertEquals, assert } from "@std/assert";
import "../../../apps/ui/src/components/app-sidebar/app-sidebar.ts";
import { AppSidebar } from "../../../apps/ui/src/components/app-sidebar/app-sidebar.ts";

Deno.test("AppSidebar: toggle works correctly", () => {
    const sidebar = new AppSidebar();
    
    // Initial state: 'games' is expanded
    assert(sidebar.isExpanded('games'));
    assert(!sidebar.isExpanded('activity'));

    // Toggle 'games' off
    sidebar.toggle('games', []);
    assert(!sidebar.isExpanded('games'));

    // Toggle 'games' on
    sidebar.toggle('games', []);
    assert(sidebar.isExpanded('games'));
});

Deno.test("AppSidebar: isActive logic", () => {
    const sidebar = new AppSidebar();
    
    sidebar.currentPath = '/';
    assert(sidebar.isActive('/'));
    assert(!sidebar.isActive('/settings'));

    sidebar.currentPath = '/settings';
    assert(!sidebar.isActive('/'));
    assert(sidebar.isActive('/settings'));

    sidebar.currentPath = '/games/sonic';
    assert(sidebar.isActive('/games'));
    // Depending on logic, '/' might be active if it's a prefix? 
    // The implementation says: if (href === '/') return this.currentPath === '/';
    assert(!sidebar.isActive('/')); 
});

Deno.test("AppSidebar: refreshes platforms on platforms-updated event", async () => {
    let callCount = 0;
    (globalThis as unknown as { fetch: unknown }).fetch = (_url: string) => {
        callCount++;
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
                { id: "p1", name: "PlayStation", slug: "psx" },
                { id: "p2", name: "Genesis", slug: "genesis" }
            ])
        });
    };

    const sidebar = new AppSidebar();
    document.body.appendChild(sidebar);
    await sidebar.updateComplete;

    const initialCalls = callCount;
    assert(initialCalls >= 1);

    // Trigger platforms update handler
    await sidebar.handlePlatformsUpdated();
    await sidebar.updateComplete;

    assert(callCount > initialCalls);
    assertEquals(sidebar.platforms.length, 2);
    assertEquals(sidebar.platforms[0].name, "PlayStation");
    assert(sidebar.isExpanded("platforms"));

    document.body.removeChild(sidebar);
});
