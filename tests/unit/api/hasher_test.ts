import { assertEquals } from "@repo/tests/utils/assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { computeCrc32, calculateFileHashes } from "../../../apps/api/src/hasher.ts";

test("hasher: computeCrc32 computes accurate CRC32 for byte arrays", () => {
  const helloBytes = new TextEncoder().encode("hello");
  const crc = computeCrc32(helloBytes);
  assertEquals(crc, "3610A686");

  const emptyBytes = new Uint8Array(0);
  assertEquals(computeCrc32(emptyBytes), "00000000");
});

test("hasher: calculateFileHashes calculates stream hashes correctly", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-hasher-test-"));
  const testFile = path.join(tempDir, "test.bin");
  const content = new TextEncoder().encode("The quick brown fox jumps over the lazy dog");

  try {
    await fs.writeFile(testFile, content);
    const hashes = await calculateFileHashes(testFile);

    assertEquals(hashes.size, content.length);
    assertEquals(hashes.crc32, "414FA339");
    assertEquals(hashes.sha1, "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12");
    assertEquals(hashes.md5, "9e107d9d372bb6826bd81d3542a419d6");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
