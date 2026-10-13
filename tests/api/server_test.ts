import { assertEquals } from "@repo/tests/utils/assert";
import createServer from "../../apps/api/src/app.ts";

const setup = () => {
  return createServer('/tmp', './dist');
}

test("GET /api/health should return ok", async () => {
  const res = await setup().request("/api/health");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json, { status: "ok" });
});

test("GET /api/roms should return list", async () => {
  // We expect at least the dummy rom if the tests run in an env where that exists
  // For integration test, we might want to mock, but here we run against the real logic
  // which scans ./roms.
  // We need to make sure we run this test where ./roms exists or mock the scanner.
  // Since we are running from root, ./roms exists.
  
  const res = await setup().request("/api/roms");
  assertEquals(res.status, 200);
  const json = await res.json();
  // We know there's at least one rom
  assertEquals(Array.isArray(json), true);
  // Verify structure of first item if exists
  if (json.length > 0) {
    const rom = json[0];
    assertEquals(typeof rom.id, "string");
    assertEquals(typeof rom.filename, "string");
  }
});
