import { assertEquals } from "jsr:@std/assert@^0.217.0";
import { executeSyncPlan } from "../../../apps/cli/src/executor.ts";
import { createSyncPlan } from "../../../apps/cli/src/planner.ts";
import { loadState, type CliState } from "../../../apps/cli/src/state.ts";
import { calculateFileSha1 } from "../../../apps/cli/src/hasher.ts";
import type { Manifest, ManifestSet } from "@repo/shared";
import type { CliConfig } from "../../../apps/cli/src/config.ts";
import type { ApiClient } from "../../../apps/cli/src/api-client.ts";
import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";

Deno.test("cli executor: atomic installation, state recording, and clean removal", async () => {
  const tempDir = await Deno.makeTempDir();
  const romsDir = `${tempDir}/roms`;
  const biosDir = `${tempDir}/bios`;
  const statePath = `${tempDir}/state.json`;

  await Deno.mkdir(romsDir, { recursive: true });
  await Deno.mkdir(biosDir, { recursive: true });

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

  const cueContent = "FILE \"game.bin\" BINARY\n  TRACK 01 MODE1/2352\n    INDEX 01 00:00:00";
  const binContent = "DUMMY BINARY TRACK CONTENT 1234567890";

  // Compute test hashes
  const cueTemp = await Deno.makeTempFile();
  await Deno.writeTextFile(cueTemp, cueContent);
  const cueSha1 = await calculateFileSha1(cueTemp);
  await Deno.remove(cueTemp);

  const binTemp = await Deno.makeTempFile();
  await Deno.writeTextFile(binTemp, binContent);
  const binSha1 = await calculateFileSha1(binTemp);
  await Deno.remove(binTemp);

  const cueSet: ManifestSet = {
    kind: "rom",
    id: "psx-cue-set",
    gameId: "game-psx",
    systemId: "sys-psx",
    esFolder: "psx",
    name: "Ridge Racer (USA)",
    setType: "cue",
    launchPath: "psx/Ridge Racer (USA)/game.cue",
    setHash: "sethash-rr",
    totalSize: cueContent.length + binContent.length,
    files: [
      {
        id: "cue-file-id",
        path: "psx/Ridge Racer (USA)/game.cue",
        size: cueContent.length,
        sha1: cueSha1,
        role: "launch",
      },
      {
        id: "bin-file-id",
        path: "psx/Ridge Racer (USA)/game.bin",
        size: binContent.length,
        sha1: binSha1,
        role: "track",
      },
    ],
    requires: [],
    implicit: false,
  };

  const manifest: Manifest = {
    deviceId: "dev-test",
    version: "v-initial",
    generatedAt: new Date().toISOString(),
    overBudget: false,
    totalBytes: cueSet.totalSize,
    sets: [cueSet],
    warnings: [],
  };

  // Mock ApiClient
  const mockClient = {
    downloadFile: async (fileId: string, destPath: string, _sha1: string) => {
      await ensureDir(dirname(destPath));
      if (fileId === "cue-file-id") {
        await Deno.writeTextFile(destPath, cueContent);
      } else if (fileId === "bin-file-id") {
        await Deno.writeTextFile(destPath, binContent);
      }
    },
    postReport: async () => {},
  } as unknown as ApiClient;

  try {
    const state: CliState = {
      schema: 1,
      manifestVersion: "",
      sets: {},
      saves: {},
    };

    // 1. Plan install
    const plan = await createSyncPlan(manifest, state, dummyConfig);
    assertEquals(plan.toInstall.length, 1);

    // 2. Execute install
    const result = await executeSyncPlan(
      plan,
      manifest,
      state,
      statePath,
      dummyConfig,
      mockClient
    );
    assertEquals(result.installedCount, 1);
    assertEquals(result.failedCount, 0);

    // Verify files on disk
    const installedCue = `${romsDir}/psx/Ridge Racer (USA)/game.cue`;
    const installedBin = `${romsDir}/psx/Ridge Racer (USA)/game.bin`;

    const cueStat = await Deno.stat(installedCue);
    const binStat = await Deno.stat(installedBin);
    assertEquals(cueStat.isFile, true);
    assertEquals(binStat.isFile, true);

    // Verify state.json
    const reloadedState = await loadState(statePath);
    const recorded = reloadedState.sets["rom:psx-cue-set"];
    assertEquals(recorded !== undefined, true);
    assertEquals(recorded.setHash, "sethash-rr");
    assertEquals(recorded.files["psx/Ridge Racer (USA)/game.cue"].sha1, cueSha1);
    assertEquals(recorded.files["psx/Ridge Racer (USA)/game.bin"].sha1, binSha1);

    // 3. Plan removal (server drops set)
    const emptyManifest: Manifest = {
      ...manifest,
      version: "v-empty",
      sets: [],
    };

    const removePlan = await createSyncPlan(emptyManifest, reloadedState, dummyConfig);
    assertEquals(removePlan.toRemove.length, 1);

    // 4. Execute removal
    const removeResult = await executeSyncPlan(
      removePlan,
      emptyManifest,
      reloadedState,
      statePath,
      dummyConfig,
      mockClient
    );
    assertEquals(removeResult.removedCount, 1);

    // Verify files are deleted
    let cueExists = true;
    try {
      await Deno.stat(installedCue);
    } catch {
      cueExists = false;
    }
    assertEquals(cueExists, false);

    // Verify state.json was updated
    const finalState = await loadState(statePath);
    assertEquals(finalState.sets["rom:psx-cue-set"], undefined);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
