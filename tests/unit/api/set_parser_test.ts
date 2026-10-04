import { assertEquals } from "@std/assert";
import { parseCueFile, parseM3uFile, parseGdiFile } from "../../../apps/api/src/set-parser.ts";
import { join } from "@std/path";

Deno.test("set-parser: parses .cue and resolves files case-insensitively", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "romanager-cue-test-" });
  try {
    const binPath = join(tmpDir, "Crash_Bandicoot.bin");
    await Deno.writeTextFile(binPath, "dummy bin content");

    // Reference uppercase in cue
    const cueContent = `FILE "CRASH_BANDICOOT.BIN" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n`;
    const cuePath = join(tmpDir, "game.cue");
    await Deno.writeTextFile(cuePath, cueContent);

    const result = await parseCueFile(cuePath);
    assertEquals(result.isComplete, true);
    assertEquals(result.files.length, 1);
    assertEquals(result.files[0].resolvedPath, binPath);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("set-parser: flags missing track as incomplete", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "romanager-incomplete-test-" });
  try {
    const cueContent = `FILE "non_existent_file.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n`;
    const cuePath = join(tmpDir, "incomplete.cue");
    await Deno.writeTextFile(cuePath, cueContent);

    const result = await parseCueFile(cuePath);
    assertEquals(result.isComplete, false);
    assertEquals(result.files.length, 1);
    assertEquals(result.files[0].resolvedPath, null);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("set-parser: parses .m3u with nested .cue files", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "romanager-m3u-test-" });
  try {
    const disc1Bin = join(tmpDir, "disc1.bin");
    const disc2Bin = join(tmpDir, "disc2.bin");
    await Deno.writeTextFile(disc1Bin, "disc1 bin content");
    await Deno.writeTextFile(disc2Bin, "disc2 bin content");

    const disc1Cue = join(tmpDir, "disc1.cue");
    const disc2Cue = join(tmpDir, "disc2.cue");
    await Deno.writeTextFile(disc1Cue, `FILE "disc1.bin" BINARY\n  TRACK 01 MODE2/2352\n`);
    await Deno.writeTextFile(disc2Cue, `FILE "disc2.bin" BINARY\n  TRACK 01 MODE2/2352\n`);

    const m3uPath = join(tmpDir, "game.m3u");
    await Deno.writeTextFile(m3uPath, `# Playlist\ndisc1.cue\ndisc2.cue\n`);

    const result = await parseM3uFile(m3uPath);
    assertEquals(result.isComplete, true);
    assertEquals(result.files.length, 4); // disc1.cue, disc1.bin, disc2.cue, disc2.bin
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("set-parser: parses .gdi files", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "romanager-gdi-test-" });
  try {
    const track1 = join(tmpDir, "track01.bin");
    const track2 = join(tmpDir, "track02.raw");
    await Deno.writeTextFile(track1, "track 1 content");
    await Deno.writeTextFile(track2, "track 2 content");

    const gdiContent = `2\n1 0 4 2352 "track01.bin" 0\n2 600 0 2352 "track02.raw" 0\n`;
    const gdiPath = join(tmpDir, "game.gdi");
    await Deno.writeTextFile(gdiPath, gdiContent);

    const result = await parseGdiFile(gdiPath);
    assertEquals(result.isComplete, true);
    assertEquals(result.files.length, 2);
    assertEquals(result.files[0].resolvedPath, track1);
    assertEquals(result.files[1].resolvedPath, track2);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
