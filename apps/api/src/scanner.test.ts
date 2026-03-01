import { assertEquals } from "@std/assert";
import { generateId, slugify } from "./utils.ts";

Deno.test("slugify", () => {
  assertEquals(slugify("Super Mario Bros."), "super-mario-bros");
  assertEquals(slugify("Sonic the Hedgehog 2"), "sonic-the-hedgehog-2");
  assertEquals(slugify("The Legend of Zelda: Ocarina of Time"), "the-legend-of-zelda-ocarina-of-time");
  assertEquals(slugify("  Trim Me  "), "trim-me");
});

Deno.test("generateId deterministic", async () => {
    const id1 = await generateId("NES:Super Mario Bros.");
    const id2 = await generateId("NES:Super Mario Bros.");
    const id3 = await generateId("SNES:Super Mario World");

    assertEquals(id1, id2, "IDs should be deterministic");
    if (id1 === id3) {
        throw new Error("Different inputs should generate different IDs");
    }
    console.log(`Generated ID for NES:Super Mario Bros.: ${id1}`);
});
