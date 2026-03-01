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
