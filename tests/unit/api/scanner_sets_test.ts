import { assertEquals } from "@repo/tests/utils/assert";
import fs from "node:fs/promises";
import os from "node:os";
import path, { join } from "node:path";
import { scanRomsWithSets, groupDirectoryFiles } from "../../../apps/api/src/scanner-sets.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { scannedSets, scannedSetFiles, scannedFiles } from "../../../apps/api/src/db/schema.ts";
import { eq, like } from "drizzle-orm";

test("scanner-sets: groupDirectoryFiles identifies single, cue, m3u, and gdi sets", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-grouping-test-"));
  try {
    // 1. Single file
    const snesRom = join(tmpDir, "Zelda.sfc");
    await fs.writeFile(snesRom, "snes rom", "utf-8");

    // 2. Cue + Bin
    const ps1Cue = join(tmpDir, "Crash.cue");
    const ps1Bin = join(tmpDir, "crash.bin");
    await fs.writeFile(ps1Cue, `FILE "crash.bin" BINARY\n  TRACK 01 MODE2/2352\n`, "utf-8");
    await fs.writeFile(ps1Bin, "crash bin content", "utf-8");

    // 3. M3U set
    const m3uPath = join(tmpDir, "MetalGear.m3u");
    const disc1 = join(tmpDir, "mg_disc1.chd");
    const disc2 = join(tmpDir, "mg_disc2.chd");
    await fs.writeFile(disc1, "disc 1 chd", "utf-8");
    await fs.writeFile(disc2, "disc 2 chd", "utf-8");
    await fs.writeFile(m3uPath, "mg_disc1.chd\nmg_disc2.chd\n", "utf-8");

    const files = [
      { path: snesRom, filename: "Zelda.sfc", dir: tmpDir, size: 8 },
      { path: ps1Cue, filename: "Crash.cue", dir: tmpDir, size: 40 },
      { path: ps1Bin, filename: "crash.bin", dir: tmpDir, size: 17 },
      { path: m3uPath, filename: "MetalGear.m3u", dir: tmpDir, size: 26 },
      { path: disc1, filename: "mg_disc1.chd", dir: tmpDir, size: 10 },
      { path: disc2, filename: "mg_disc2.chd", dir: tmpDir, size: 10 },
    ];

    const sets = await groupDirectoryFiles(tmpDir, files);

    // Expect 3 sets: MetalGear (m3u), Crash (cue), Zelda (single)
    assertEquals(sets.length, 3);

    const m3uSet = sets.find(s => s.setType === "m3u");
    assertEquals(Boolean(m3uSet), true);
    assertEquals(m3uSet?.status, "complete");
    assertEquals(m3uSet?.files.length, 3); // m3u + disc1 + disc2

    const cueSet = sets.find(s => s.setType === "cue");
    assertEquals(Boolean(cueSet), true);
    assertEquals(cueSet?.status, "complete");
    assertEquals(cueSet?.files.length, 2); // cue + bin

    const singleSet = sets.find(s => s.setType === "single");
    assertEquals(Boolean(singleSet), true);
    assertEquals(singleSet?.files.length, 1);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("scanner-sets: scanRomsWithSets discovers and stages directory sets (.ps3)", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-dir-set-test-"));
  try {
    const dirSet = join(tmpDir, "DemonSouls.ps3");
    await fs.mkdir(dirSet, { recursive: true });
    await fs.writeFile(join(dirSet, "PARAM.SFO"), "sfo content", "utf-8");
    await fs.writeFile(join(dirSet, "EBOOT.BIN"), "eboot content", "utf-8");

    const staged = await scanRomsWithSets(tmpDir);

    const ps3Set = staged.find(s => s.setType === "directory");
    assertEquals(Boolean(ps3Set), true);
    assertEquals(ps3Set?.filename, "DemonSouls.ps3");
    assertEquals(ps3Set?.status, "complete");

    // Check DB records in scanned_sets
    const dbSet = await db.select().from(scannedSets).where(eq(scannedSets.name, "DemonSouls.ps3")).get();
    assertEquals(Boolean(dbSet), true);
    assertEquals(dbSet?.setType, "directory");

    // Clean up DB records
    if (dbSet) {
      await db.delete(scannedSetFiles).where(eq(scannedSetFiles.setId, dbSet.id));
      await db.delete(scannedSets).where(eq(scannedSets.id, dbSet.id));
      await db.delete(scannedFiles).where(like(scannedFiles.path, `%${tmpDir}%`));
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
