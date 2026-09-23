import { assertEquals } from "jsr:@std/assert";
import { scanRoms, verifyFileAgainstWhitelist } from "../../../apps/api/src/scanner.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { scannedFiles } from "../../../apps/api/src/db/schema.ts";
import { join } from "@std/path";
import { eq, like, and } from "drizzle-orm";

const FIXTURE_DIR = "./tests/fixtures/roms_whitelist_test";

async function setupFixture() {
  await Deno.mkdir(FIXTURE_DIR, { recursive: true });
  
  // 1. Whitelisted extension without magic number
  await Deno.writeTextFile(join(FIXTURE_DIR, "game.sfc"), "sfc content");

  // 2. Whitelisted extension with matching magic number (NES header: 4E 45 53 1A)
  const validNes = new Uint8Array([0x4E, 0x45, 0x53, 0x1A, 0x01, 0x02, 0x00]);
  await Deno.writeFile(join(FIXTURE_DIR, "valid.nes"), validNes);

  // 3. Whitelisted extension with invalid magic number
  const invalidNes = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x01, 0x02, 0x00]);
  await Deno.writeFile(join(FIXTURE_DIR, "invalid.nes"), invalidNes);

  // 4. Non-whitelisted file
  await Deno.writeTextFile(join(FIXTURE_DIR, "readme.txt"), "readme text");
  await Deno.writeTextFile(join(FIXTURE_DIR, "info.nfo"), "nfo text");
}

async function teardownFixture() {
  try {
    await Deno.remove(FIXTURE_DIR, { recursive: true });
  } catch {}
}

Deno.test("verifyFileAgainstWhitelist: extension and magic number logic", async () => {
  await setupFixture();
  try {
    const whitelist = [
      { extension: "sfc", magicNumber: null },
      { extension: "nes", magicNumber: "4E45531A" },
    ];

    // Non-whitelisted extension
    const txtCheck = await verifyFileAgainstWhitelist(join(FIXTURE_DIR, "readme.txt"), "readme.txt", whitelist);
    assertEquals(txtCheck, false);

    // Whitelisted without magic number
    const sfcCheck = await verifyFileAgainstWhitelist(join(FIXTURE_DIR, "game.sfc"), "game.sfc", whitelist);
    assertEquals(sfcCheck, true);

    // Whitelisted with matching magic number
    const validNesCheck = await verifyFileAgainstWhitelist(join(FIXTURE_DIR, "valid.nes"), "valid.nes", whitelist);
    assertEquals(validNesCheck, true);

    // Whitelisted with invalid magic number
    const invalidNesCheck = await verifyFileAgainstWhitelist(join(FIXTURE_DIR, "invalid.nes"), "invalid.nes", whitelist);
    assertEquals(invalidNesCheck, false);
  } finally {
    await teardownFixture();
  }
});

Deno.test("scanRoms stages only whitelisted files into scanned_files", async () => {
  await setupFixture();
  try {
    await scanRoms(FIXTURE_DIR);

    const sfcPath = (await Deno.realPath(join(FIXTURE_DIR, "game.sfc"))).replace(/\\/g, "/");
    const validNesPath = (await Deno.realPath(join(FIXTURE_DIR, "valid.nes"))).replace(/\\/g, "/");
    const txtPath = (await Deno.realPath(join(FIXTURE_DIR, "readme.txt"))).replace(/\\/g, "/");

    // game.sfc should be in scanned_files
    const sfcRecord = await db.select().from(scannedFiles)
      .where(and(eq(scannedFiles.filename, "game.sfc"), like(scannedFiles.path, "%roms_whitelist_test%")))
      .get();
    assertEquals(Boolean(sfcRecord), true);

    // valid.nes should be in scanned_files
    const validNesRecord = await db.select().from(scannedFiles)
      .where(and(eq(scannedFiles.filename, "valid.nes"), like(scannedFiles.path, "%roms_whitelist_test%")))
      .get();
    assertEquals(Boolean(validNesRecord), true);

    // readme.txt from fixture should NOT be in scanned_files
    const txtRecord = await db.select().from(scannedFiles)
      .where(and(eq(scannedFiles.filename, "readme.txt"), like(scannedFiles.path, "%roms_whitelist_test%")))
      .get();
    assertEquals(txtRecord, undefined);

    // Clean up inserted fixture records from DB
    await db.delete(scannedFiles).where(like(scannedFiles.path, "%roms_whitelist_test%"));
  } finally {
    await teardownFixture();
  }
});
