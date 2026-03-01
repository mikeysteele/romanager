import "./setup.ts";
import { assertEquals } from "jsr:@std/assert";
import "../../../apps/ui/src/components/app-header/app-header.ts";
import type { AppHeader } from "../../../apps/ui/src/components/app-header/app-header.ts";

Deno.test("AppHeader: renders brand and search bar", async () => {
    const el = document.createElement("app-header") as AppHeader;
    document.body.appendChild(el);
    await el.updateComplete;

    const brand = el.shadowRoot!.querySelector(".brand a") as HTMLAnchorElement;
    assertEquals(brand.textContent, "Romanager");

    const searchBar = el.shadowRoot!.querySelector(".search-bar span") as HTMLSpanElement;
    assertEquals(searchBar.textContent?.includes("Search"), true);

    document.body.removeChild(el);
});
