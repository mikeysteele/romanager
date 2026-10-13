import { assertEquals } from "@repo/tests/utils/assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSyncPlan } from "../../../apps/cli/src/planner.ts";
import type { Manifest, ManifestSet } from "@repo/shared";
import type { CliConfig } from "../../../apps/cli/src/config.ts";
import type { CliState } from "../../../apps/cli/src/state.ts";

test("cli planner: reconciles installs, updates, removals, and conflicts", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-planner-test-"));
  const romsDir = `${tempDir}/roms`;
  const biosDir = `${tempDir}/bios`;
  await fs.mkdir(romsDir, { recursive: true });
  await fs.mkdir(biosDir, { recursive: true });

  const dummyConfig: CliConfig = {
    server: "http://localhost:8000",
    apiKey: "rmg_test",
    deviceId: "dev-test",
    preset: "batocera",
    paths: {
      roms: romsDir,
      bios: biosDir,
      saves: `${tempDir}/saves`,
    },
    sync: {
      concurrency: 2,
      deleteMode: "delete",
      trashRetentionDays: 14,
      minFreeBytes: 0,
    },
    saves: {
      enabled: false,
      include: [],
      debounceSeconds: 30,
    },
    hooks: {},
  };

  const setA: ManifestSet = {
    kind: "rom",
    id: "set-a",
    gameId: "game-a",
    systemId: "sys-snes",
    esFolder: "snes",
    name: "Game A",
    setType: "single",
    launchPath: "snes/game_a.sfc",
    setHash: "hash-a",
    totalSize: 500,
    files: [
      { id: "f1", path: "snes/game_a.sfc", size: 500, sha1: "sha1-a", role: "launch" },
    ],
    requires: [],
    implicit: false,
  };

  const setB: ManifestSet = {
    kind: "rom",
    id: "set-b",
    gameId: "game-b",
    systemId: "sys-snes",
    esFolder: "snes",
    name: "Game B",
    setType: "single",
    launchPath: "snes/game_b.sfc",
    setHash: "hash-b",
    totalSize: 800,
    files: [
      { id: "f2", path: "snes/game_b.sfc", size: 800, sha1: "sha1-b", role: "launch" },
    ],
    requires: [],
    implicit: false,
  };

  const manifest: Manifest = {
    deviceId: "dev-test",
    version: "v1",
    generatedAt: new Date().toISOString(),
    overBudget: false,
    totalBytes: 1300,
    sets: [setA, setB],
    warnings: [],
  };

  try {
    // 1. Fresh state: both sets need installation
    const state0: CliState = {
      schema: 1,
      manifestVersion: "",
      sets: {},
      saves: {},
    };

    const plan1 = await createSyncPlan(manifest, state0, dummyConfig);
    assertEquals(plan1.toInstall.length, 2);
    assertEquals(plan1.toUpdate.length, 0);
    assertEquals(plan1.toRemove.length, 0);
    assertEquals(plan1.conflicts.length, 0);

    // Simulate setA already recorded in state with matching hash
    const state1: CliState = {
      schema: 1,
      manifestVersion: "v1",
      sets: {
        "rom:set-a": {
          kind: "rom",
          setHash: "hash-a",
          requires: [],
          launchPath: "snes/game_a.sfc",
          files: {
            "snes/game_a.sfc": { sha1: "sha1-a", size: 500, mtime: Date.now() },
          },
          syncedAt: new Date().toISOString(),
        },
      },
      saves: {},
    };

    // 2. Collision detection: if an unowned file already exists on disk
    await fs.mkdir(`${romsDir}/snes`, { recursive: true });
    await fs.writeFile(`${romsDir}/snes/game_a.sfc`, "existing unowned file", "utf-8");

    const plan2 = await createSyncPlan(manifest, state1, dummyConfig);
    assertEquals(plan2.toInstall.length, 1); // only setB
    assertEquals(plan2.conflicts.length, 1); // setA is a conflict
    assertEquals(plan2.conflicts[0].paths.includes("snes/game_a.sfc"), true);

    // Clean up collision file
    await fs.rm(`${romsDir}/snes/game_a.sfc`, { force: true });

    // 3. State has setA, but manifest removed setA -> setA is toRemove
    const state3: CliState = {
      schema: 1,
      manifestVersion: "v1",
      sets: {
        "rom:set-a": {
          kind: "rom",
          setHash: "hash-a",
          requires: [],
          launchPath: "snes/game_a.sfc",
          files: {
            "snes/game_a.sfc": { sha1: "sha1-a", size: 500, mtime: Date.now() },
          },
          syncedAt: new Date().toISOString(),
        },
      },
      saves: {},
    };

    const manifestWithoutA: Manifest = {
      ...manifest,
      sets: [setB],
    };

    const plan3 = await createSyncPlan(manifestWithoutA, state3, dummyConfig);
    assertEquals(plan3.toInstall.length, 1); // setB
    assertEquals(plan3.toRemove.length, 1); // setA
    assertEquals(plan3.toRemove[0].key, "rom:set-a");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
