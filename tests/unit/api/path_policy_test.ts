import { assertEquals, assertThrows } from "@repo/tests/utils/assert";
import path from "node:path";
import os from "node:os";
import {
  isWithinRoots,
  assertWithinRoots,
  PathPolicyViolation,
  getAllowedStorageRoots,
  getAllowedBrowseRoots,
} from "../../../apps/api/src/path-policy.ts";

test("PathPolicy: isWithinRoots verifies path containment correctly", () => {
  const root = path.resolve("/data/roms");

  assertEquals(isWithinRoots(root, path.resolve("/data/roms/snes/smw.smc")), true);
  assertEquals(isWithinRoots(root, path.resolve("/data/roms")), true);
  assertEquals(isWithinRoots(root, path.resolve("/data/roms2/game.bin")), false);
  assertEquals(isWithinRoots(root, path.resolve("/etc/passwd")), false);
  assertEquals(isWithinRoots(root, path.resolve("/data/roms/../etc/passwd")), false);
});

test("PathPolicy: assertWithinRoots throws PathPolicyViolation on escape", () => {
  const root = path.resolve("/app/storage");

  const valid = assertWithinRoots(root, path.resolve("/app/storage/file.txt"));
  assertEquals(valid, path.resolve("/app/storage/file.txt"));

  assertThrows(
    () => assertWithinRoots(root, path.resolve("/app/other/file.txt")),
    PathPolicyViolation
  );
});

test("PathPolicy: getAllowedStorageRoots returns valid roots including ROMS_DIR", async () => {
  const roots = await getAllowedStorageRoots();
  assertEquals(Array.isArray(roots), true);
  assertEquals(roots.length > 0, true);
  // Should include test/temp dirs or roms
  const hasRomsOrTmp = roots.some(
    (r) => r.includes("roms") || r === path.resolve(os.tmpdir()) || r === path.resolve(process.cwd())
  );
  assertEquals(hasRomsOrTmp, true);
});

test("PathPolicy: getAllowedBrowseRoots returns formatted shortcut entries", async () => {
  const browseRoots = await getAllowedBrowseRoots();
  assertEquals(Array.isArray(browseRoots), true);
  assertEquals(browseRoots.length > 0, true);
  for (const entry of browseRoots) {
    assertEquals(typeof entry.label, "string");
    assertEquals(typeof entry.path, "string");
  }
});
