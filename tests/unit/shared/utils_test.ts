import { assertEquals } from "@repo/tests/utils/assert";
import { normalizePath, getPlatformFromFilename } from "../../../packages/shared/mod.ts";

test("normalizePath should replace backslashes with slashes", () => {
  assertEquals(normalizePath("foo\\bar"), "foo/bar");
  assertEquals(normalizePath("foo/bar"), "foo/bar");
});

test("getPlatformFromFilename should return correct platform", () => {
  assertEquals(getPlatformFromFilename("game.nes"), "nes");
  assertEquals(getPlatformFromFilename("game.sfc"), "snes");
  assertEquals(getPlatformFromFilename("game.gb"), "gameboy");
  assertEquals(getPlatformFromFilename("game.txt"), "unknown");
});
  