import { assertEquals } from "jsr:@std/assert";
import { scanRoms } from "../../../apps/api/src/scanner.ts";
import { join } from "@std/path";

const FIXTURE_DIR = "./tests/fixtures/roms";

// Helper to setup fixture
async function setupFixture() {
  await Deno.mkdir(FIXTURE_DIR, { recursive: true });
  await Deno.writeTextFile(join(FIXTURE_DIR, "test.nes"), "dummy content");
  await Deno.writeTextFile(join(FIXTURE_DIR, "readme.txt"), "readme");
}

async function teardownFixture() {
  await Deno.remove(FIXTURE_DIR, { recursive: true });
}

Deno.test("scanRoms should find ROMs", async () => {
  await setupFixture();
  try {
    const roms = await scanRoms(FIXTURE_DIR);
    assertEquals(roms.length, 1);
    assertEquals(roms[0].filename, "test.nes");
    assertEquals(roms[0].platform, "nes");
  } finally {
    await teardownFixture();
  }
});
