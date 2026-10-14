import { assertEquals } from "@repo/tests/utils/assert";
import process from "node:process";
import { filesystemRouter } from "../../../apps/api/src/routes/filesystem.ts";

test("GET /api/filesystem/browse should return directories and shortcuts", async () => {
    const req = new Request("http://localhost/browse");
    const res = await filesystemRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(typeof json.currentPath, "string");
    assertEquals(Array.isArray(json.directories), true);
    assertEquals(Array.isArray(json.shortcuts), true);
    assertEquals(json.shortcuts.length > 0, true);
});

test("GET /api/filesystem/browse with path parameter should browse specific directory", async () => {
    const cwd = process.cwd();
    const req = new Request(`http://localhost/browse?path=${encodeURIComponent(cwd)}`);
    const res = await filesystemRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.currentPath, cwd);
    // Should contain directories like "apps", "packages"
    const dirNames = json.directories.map((d: { name: string }) => d.name);
    assertEquals(dirNames.includes("apps"), true);
    assertEquals(dirNames.includes("packages"), true);
});

test("GET /api/filesystem/browse handles non-existent path gracefully", async () => {
    const fakePath = "/path/that/definitely/does/not/exist/99999";
    const req = new Request(`http://localhost/browse?path=${encodeURIComponent(fakePath)}`);
    const res = await filesystemRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(typeof json.currentPath, "string");
    assertEquals(Array.isArray(json.directories), true);
});
