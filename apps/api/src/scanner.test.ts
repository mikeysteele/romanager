import { test, expect } from "vitest";
import { generateId, slugify } from "./utils.ts";

test("slugify", () => {
  expect(slugify("Super Mario Bros.")).toBe("super-mario-bros");
  expect(slugify("Sonic the Hedgehog 2")).toBe("sonic-the-hedgehog-2");
  expect(slugify("The Legend of Zelda: Ocarina of Time")).toBe("the-legend-of-zelda-ocarina-of-time");
  expect(slugify("  Trim Me  ")).toBe("trim-me");
});

test("generateId deterministic", async () => {
  const id1 = await generateId("NES:Super Mario Bros.");
  const id2 = await generateId("NES:Super Mario Bros.");
  const id3 = await generateId("SNES:Super Mario World");

  expect(id1).toBe(id2);
  expect(id1).not.toBe(id3);
});
