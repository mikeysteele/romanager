import { assertEquals, assertThrows } from "@repo/tests/utils/assert";
import { sanitizeRelativePath, PathPolicyViolation } from "../../../packages/shared/mod.ts";

test("sanitizeRelativePath: normalizes and accepts valid relative paths", () => {
  assertEquals(sanitizeRelativePath("snes/smw.srm"), "snes/smw.srm");
  assertEquals(sanitizeRelativePath("roms\\sub\\game.bin"), "roms/sub/game.bin");
  assertEquals(sanitizeRelativePath("./snes/./smw.srm"), "snes/smw.srm");
  assertEquals(sanitizeRelativePath("game.sav"), "game.sav");
});

test("sanitizeRelativePath: rejects directory traversal", () => {
  assertThrows(
    () => sanitizeRelativePath("../etc/passwd"),
    PathPolicyViolation,
    "directory traversal"
  );
  assertThrows(
    () => sanitizeRelativePath("snes/../../genesis/sonic.bin"),
    PathPolicyViolation,
    "directory traversal"
  );
  assertThrows(
    () => sanitizeRelativePath(".."),
    PathPolicyViolation,
    "directory traversal"
  );
});

test("sanitizeRelativePath: rejects absolute paths", () => {
  assertThrows(
    () => sanitizeRelativePath("/etc/shadow"),
    PathPolicyViolation,
    "cannot be an absolute path"
  );
  assertThrows(
    () => sanitizeRelativePath("C:\\Windows\\System32"),
    PathPolicyViolation,
    "cannot be an absolute path"
  );
});

test("sanitizeRelativePath: rejects null bytes and empty paths", () => {
  assertThrows(
    () => sanitizeRelativePath("saves/\0evil.bin"),
    PathPolicyViolation,
    "null bytes"
  );
  assertThrows(
    () => sanitizeRelativePath(""),
    PathPolicyViolation,
    "non-empty string"
  );
  assertThrows(
    () => sanitizeRelativePath("///"),
    PathPolicyViolation,
    "cannot be an absolute path"
  );
  assertThrows(
    () => sanitizeRelativePath("."),
    PathPolicyViolation,
    "cannot be empty"
  );
});
