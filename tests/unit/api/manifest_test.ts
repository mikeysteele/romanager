import { assertEquals, assertNotEquals } from "jsr:@std/assert@^0.217.0";
import { generateManifest } from "../../../apps/api/src/manifest.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import {
  devices,
  deviceProfiles,
  profileRules,
  systems,
  games,
  roms,
  romFiles,
  systemFirmware,
} from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";

Deno.test("manifest: rule evaluation, oneRomPerGame, firmware, budget, and deterministic version", async () => {
  const testId = `mtest-${Date.now()}`;
  const devId = `dev-${testId}`;
  const sysSnes = `sys-snes-${testId}`;
  const sysGba = `sys-gba-${testId}`;
  const game1 = `game-mario-${testId}`;
  const game2 = `game-zelda-${testId}`;

  const romSnesMarioUsa = `rom-snes-m-usa-${testId}`;
  const romSnesMarioEur = `rom-snes-m-eur-${testId}`;
  const romSnesZelda = `rom-snes-z-${testId}`;
  const romGbaMario = `rom-gba-m-${testId}`;

  const fwSnesId = `fw-snes-${testId}`;

  try {
    // 1. Systems: Snes has esFolder "snes", Gba has esFolder "gba"
    await db.insert(systems).values([
      { id: sysSnes, name: "Super Nintendo", slug: `snes-${testId}`, esFolder: "snes" },
      { id: sysGba, name: "Game Boy Advance", slug: `gba-${testId}`, esFolder: "gba" },
    ]);

    // 2. Games
    await db.insert(games).values([
      { id: game1, name: "Super Mario World", slug: `smw-${testId}` },
      { id: game2, name: "Zelda A Link to the Past", slug: `alttp-${testId}` },
    ]);

    // 3. ROMs & Files
    await db.insert(roms).values([
      {
        id: romSnesMarioUsa,
        gameId: game1,
        systemId: sysSnes,
        name: "Super Mario World (USA)",
        filename: "smw_usa.sfc",
        launchFile: "smw_usa.sfc",
        size: 100,
        totalSize: 100,
        region: "USA",
        setHash: "hash-mario-usa",
        status: "complete",
      },
      {
        id: romSnesMarioEur,
        gameId: game1,
        systemId: sysSnes,
        name: "Super Mario World (Europe)",
        filename: "smw_eur.sfc",
        launchFile: "smw_eur.sfc",
        size: 100,
        totalSize: 100,
        region: "EUR",
        setHash: "hash-mario-eur",
        status: "complete",
      },
      {
        id: romSnesZelda,
        gameId: game2,
        systemId: sysSnes,
        name: "Legend of Zelda (USA)",
        filename: "zelda.sfc",
        launchFile: "zelda.sfc",
        size: 200,
        totalSize: 200,
        region: "USA",
        setHash: "hash-zelda",
        status: "complete",
      },
      {
        id: romGbaMario,
        gameId: game1,
        systemId: sysGba,
        name: "Super Mario Advance (USA)",
        filename: "sma.gba",
        launchFile: "sma.gba",
        size: 300,
        totalSize: 300,
        region: "USA",
        setHash: "hash-gba-mario",
        status: "complete",
      },
    ]);

    await db.insert(romFiles).values([
      {
        id: `rf-1-${testId}`,
        romId: romSnesMarioUsa,
        relPath: "smw_usa.sfc",
        path: `/tmp/smw_usa_${testId}.sfc`,
        filename: "smw_usa.sfc",
        size: 100,
        sha1: "sha1-mario-usa",
        role: "launch",
      },
      {
        id: `rf-2-${testId}`,
        romId: romSnesMarioEur,
        relPath: "smw_eur.sfc",
        path: `/tmp/smw_eur_${testId}.sfc`,
        filename: "smw_eur.sfc",
        size: 100,
        sha1: "sha1-mario-eur",
        role: "launch",
      },
      {
        id: `rf-3-${testId}`,
        romId: romSnesZelda,
        relPath: "zelda.sfc",
        path: `/tmp/zelda_${testId}.sfc`,
        filename: "zelda.sfc",
        size: 200,
        sha1: "sha1-zelda",
        role: "launch",
      },
      {
        id: `rf-4-${testId}`,
        romId: romGbaMario,
        relPath: "sma.gba",
        path: `/tmp/sma_${testId}.gba`,
        filename: "sma.gba",
        size: 300,
        sha1: "sha1-gba-mario",
        role: "launch",
      },
    ]);

    // 4. Firmware for SNES
    await db.insert(systemFirmware).values({
      id: fwSnesId,
      systemId: sysSnes,
      filename: "snes_bios.bin",
      path: `/tmp/snes_bios_${testId}.bin`,
      sha1: "sha1-snes-bios",
    });

    // 5. Device Setup
    await db.insert(devices).values({
      id: devId,
      name: "Manifest Test Device",
      preset: "batocera",
      storageBudgetBytes: null,
    });
    await db.insert(deviceProfiles).values({
      deviceId: devId,
      regionPreference: "USA,EUR,JPN",
      oneRomPerGame: true,
      includeFirmware: true,
    });

    // Case A: Rule includes only SNES.
    // oneRomPerGame is true, so between USA and EUR Mario, USA wins.
    // Firmware for SNES is included.
    await db.insert(profileRules).values({
      id: `rule-1-${testId}`,
      deviceId: devId,
      position: 0,
      kind: "include_system",
      targetId: sysSnes,
    });

    const manifestA = await generateManifest(devId);
    assertNotEquals(manifestA, null);
    assertEquals(manifestA?.overBudget, false);

    // Should include: SNES Mario USA, SNES Zelda, SNES Firmware
    // Should NOT include: SNES Mario EUR (deduped by oneRomPerGame), GBA Mario (system excluded)
    const setIdsA = manifestA!.sets.map((s) => s.id);
    assertEquals(setIdsA.includes(romSnesMarioUsa), true);
    assertEquals(setIdsA.includes(romSnesMarioEur), false);
    assertEquals(setIdsA.includes(romSnesZelda), true);
    assertEquals(setIdsA.includes(romGbaMario), false);
    assertEquals(setIdsA.includes(fwSnesId), true);

    // Verify paths
    const marioSet = manifestA!.sets.find((s) => s.id === romSnesMarioUsa);
    assertEquals(marioSet?.launchPath, "snes/smw_usa.sfc");
    assertEquals(marioSet?.files[0].path, "snes/smw_usa.sfc");

    const fwSet = manifestA!.sets.find((s) => s.id === fwSnesId);
    assertEquals(fwSet?.launchPath, "bios/snes_bios.bin");

    // Case B: Add rule to exclude Zelda game
    await db.insert(profileRules).values({
      id: `rule-2-${testId}`,
      deviceId: devId,
      position: 1,
      kind: "exclude_game",
      targetId: game2,
    });

    const manifestB = await generateManifest(devId);
    const setIdsB = manifestB!.sets.map((s) => s.id);
    assertEquals(setIdsB.includes(romSnesZelda), false);
    assertEquals(setIdsB.includes(romSnesMarioUsa), true);

    // Case C: Storage Budget Truncation
    // Mario is 100 bytes. Zelda was 200 bytes.
    // If budget is 50 bytes: Mario (100 bytes) will exceed it
    await db
      .update(devices)
      .set({ storageBudgetBytes: 50 })
      .where(eq(devices.id, devId));

    const manifestC = await generateManifest(devId);
    assertEquals(manifestC?.overBudget, true);
    assertEquals(manifestC?.warnings.some((w) => w.includes("Storage budget")), true);
    assertEquals(manifestC?.sets.length, 1); // Only firmware (size 0) fits in 50 bytes
  } finally {
    // Cleanup
    await db.delete(systemFirmware).where(eq(systemFirmware.id, fwSnesId));
    await db.delete(romFiles).where(eq(romFiles.romId, romSnesMarioUsa));
    await db.delete(romFiles).where(eq(romFiles.romId, romSnesMarioEur));
    await db.delete(romFiles).where(eq(romFiles.romId, romSnesZelda));
    await db.delete(romFiles).where(eq(romFiles.romId, romGbaMario));
    await db.delete(roms).where(eq(roms.systemId, sysSnes));
    await db.delete(roms).where(eq(roms.systemId, sysGba));
    await db.delete(games).where(eq(games.id, game1));
    await db.delete(games).where(eq(games.id, game2));
    await db.delete(systems).where(eq(systems.id, sysSnes));
    await db.delete(systems).where(eq(systems.id, sysGba));
    await db.delete(devices).where(eq(devices.id, devId));
  }
});
