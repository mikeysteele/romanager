import { assertEquals } from "@repo/tests/utils/assert";
import fs from "node:fs/promises";
import os from "node:os";
import path, { join } from "node:path";
import { parseCueFile, parseM3uFile, parseGdiFile } from "../../../apps/api/src/set-parser.ts";

test("set-parser: parses .cue and resolves files case-insensitively", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-cue-test-"));
  try {
    const binPath = join(tmpDir, "Crash_Bandicoot.bin");
    await fs.writeFile(binPath, "dummy bin content", "utf-8");

    // Reference uppercase in cue
    const cueContent = `FILE "CRASH_BANDICOOT.BIN" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n`;
    const cuePath = join(tmpDir, "game.cue");
    await fs.writeFile(cuePath, cueContent, "utf-8");

    const result = await parseCueFile(cuePath);
    assertEquals(result.isComplete, true);
    assertEquals(result.files.length, 1);
    assertEquals(result.files[0].resolvedPath, binPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("set-parser: flags missing track as incomplete", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-incomplete-test-"));
  try {
    const cueContent = `FILE "non_existent_file.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n`;
    const cuePath = join(tmpDir, "incomplete.cue");
    await fs.writeFile(cuePath, cueContent, "utf-8");

    const result = await parseCueFile(cuePath);
    assertEquals(result.isComplete, false);
    assertEquals(result.files.length, 1);
    assertEquals(result.files[0].resolvedPath, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("set-parser: parses .m3u with nested .cue files", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-m3u-test-"));
  try {
    const disc1Bin = join(tmpDir, "disc1.bin");
    const disc2Bin = join(tmpDir, "disc2.bin");
    await fs.writeFile(disc1Bin, "disc1 bin content", "utf-8");
    await fs.writeFile(disc2Bin, "disc2 bin content", "utf-8");

    const disc1Cue = join(tmpDir, "disc1.cue");
    const disc2Cue = join(tmpDir, "disc2.cue");
    await fs.writeFile(disc1Cue, `FILE "disc1.bin" BINARY\n  TRACK 01 MODE2/2352\n`, "utf-8");
    await fs.writeFile(disc2Cue, `FILE "disc2.bin" BINARY\n  TRACK 01 MODE2/2352\n`, "utf-8");

    const m3uPath = join(tmpDir, "game.m3u");
    await fs.writeFile(m3uPath, `# Playlist\ndisc1.cue\ndisc2.cue\n`, "utf-8");

    const result = await parseM3uFile(m3uPath);
    assertEquals(result.isComplete, true);
    assertEquals(result.files.length, 4); // disc1.cue, disc1.bin, disc2.cue, disc2.bin
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("set-parser: parses .gdi files", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-gdi-test-"));
  try {
    const track1 = join(tmpDir, "track01.bin");
    const track2 = join(tmpDir, "track02.raw");
    await fs.writeFile(track1, "track 1 content", "utf-8");
    await fs.writeFile(track2, "track 2 content", "utf-8");

    const gdiContent = `2\n1 0 4 2352 "track01.bin" 0\n2 600 0 2352 "track02.raw" 0\n`;
    const gdiPath = join(tmpDir, "game.gdi");
    await fs.writeFile(gdiPath, gdiContent, "utf-8");

    const result = await parseGdiFile(gdiPath);
    assertEquals(result.isComplete, true);
    assertEquals(result.files.length, 2);
    assertEquals(result.files[0].resolvedPath, track1);
    assertEquals(result.files[1].resolvedPath, track2);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
