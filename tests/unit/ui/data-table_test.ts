import "./setup.ts";
import { assertEquals } from "@std/assert";
import type { DataTable, ColumnDef } from "../../../packages/ui-components/src/data-table/data-table.ts";

Deno.test("DataTable: renders empty state when no columns", async () => {
    // Ensure JSDOM is setup before loading Lit elements
    await import("../../../packages/ui-components/src/data-table/data-table.ts");
    
    const el = document.createElement('data-table') as DataTable<{ id: string } & Record<string, unknown>>;
    document.body.appendChild(el);
    await el.updateComplete;
    
    // Fallback to checking normal render HTML because JSDOM doesn't do shadow DOM perfectly sometimes,
    // but innerHTML on shadowRoot is supported.
    const htmlString = el.shadowRoot?.innerHTML || "";
    assertEquals(htmlString.includes("No columns defined"), true);
    
    document.body.removeChild(el);
});

Deno.test("DataTable: renders empty state when no data", async () => {
    const el = document.createElement('data-table') as DataTable<{ id: string } & Record<string, unknown>>;
    document.body.appendChild(el);
    el.columns = [{ header: "Name", key: "name" }] as ColumnDef<{ id: string } & Record<string, unknown>>[];
    await el.updateComplete;
    
    // Extra cycle for data change
    await new Promise(r => setTimeout(r, 16));
    const htmlString = el.shadowRoot?.innerHTML || "";
    assertEquals(htmlString.includes("No data available"), true);
    
    document.body.removeChild(el);
});
