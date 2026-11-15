import { assertEquals } from "@repo/tests/utils/assert";
import fs from "node:fs/promises";
import os from "node:os";
import path, { dirname } from "node:path";
import { executeSyncPlan } from "../../../apps/cli/src/executor.ts";
import { createSyncPlan } from "../../../apps/cli/src/planner.ts";
import { loadState, type CliState } from "../../../apps/cli/src/state.ts";
import { calculateFileSha1 } from "../../../apps/cli/src/hasher.ts";
import type { Manifest, ManifestSet } from "@repo/shared";
import type { CliConfig } from "../../../apps/cli/src/config.ts";
import type { ApiClient } from "../../../apps/cli/src/api-client.ts";

test("cli executor: atomic installation, state recording, and clean removal", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-executor-test-"));
  const romsDir = `${tempDir}/roms`;
  const biosDir = `${tempDir}/bios`;
  const statePath = `${tempDir}/state.json`;

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

  const cueContent = "FILE \"game.bin\" BINARY\n  TRACK 01 MODE1/2352\n    INDEX 01 00:00:00";
  const binContent = "DUMMY BINARY TRACK CONTENT 1234567890";

  // Compute test hashes
  const cueTemp = path.join(tempDir, "cueTemp.tmp");
  await fs.writeFile(cueTemp, cueContent, "utf-8");
  const cueSha1 = await calculateFileSha1(cueTemp);
  await fs.rm(cueTemp, { force: true });

  const binTemp = path.join(tempDir, "binTemp.tmp");
  await fs.writeFile(binTemp, binContent, "utf-8");
  const binSha1 = await calculateFileSha1(binTemp);
  await fs.rm(binTemp, { force: true });

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
      await fs.mkdir(dirname(destPath), { recursive: true });
      if (fileId === "cue-file-id") {
        await fs.writeFile(destPath, cueContent, "utf-8");
      } else if (fileId === "bin-file-id") {
        await fs.writeFile(destPath, binContent, "utf-8");
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

    const cueStat = await fs.stat(installedCue);
    const binStat = await fs.stat(installedBin);
    assertEquals(cueStat.isFile(), true);
    assertEquals(binStat.isFile(), true);

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
      await fs.stat(installedCue);
    } catch {
      cueExists = false;
    }
    assertEquals(cueExists, false);

    // Verify state.json was updated
    const finalState = await loadState(statePath);
    assertEquals(finalState.sets["rom:psx-cue-set"], undefined);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("cli executor: multi-file firmware directory sync strips bios/ prefix and installs all files", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-fw-executor-test-"));
  const romsDir = `${tempDir}/roms`;
  const biosDir = `${tempDir}/bios`;
  const statePath = `${tempDir}/state.json`;

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

  const bootContent = "DC_BOOT_BINARY_DATA";
  const flashContent = "DC_FLASH_BINARY_DATA";

  const computeSha1 = async (content: string) => {
    const tmp = path.join(tempDir, `hash-${Math.random()}.tmp`);
    await fs.writeFile(tmp, content, "utf-8");
    const sha1 = await calculateFileSha1(tmp);
    await fs.rm(tmp, { force: true });
    return sha1;
  };

  const bootSha1 = await computeSha1(bootContent);
  const flashSha1 = await computeSha1(flashContent);

  const fwSet: ManifestSet = {
    kind: "firmware",
    id: "fw-dc-set",
    gameId: null,
    systemId: "sys-dc",
    esFolder: "bios",
    name: "Dreamcast BIOS",
    setType: "directory",
    launchPath: "bios/dc/dc_boot.bin",
    setHash: "sethash-dc-fw",
    totalSize: bootContent.length + flashContent.length,
    files: [
      {
        id: "fw-boot-id",
        path: "bios/dc/dc_boot.bin",
        size: bootContent.length,
        sha1: bootSha1,
        role: "aux",
      },
      {
        id: "fw-flash-id",
        path: "bios/dc/dc_flash.bin",
        size: flashContent.length,
        sha1: flashSha1,
        role: "aux",
      },
    ],
    requires: [],
    implicit: false,
  };

  const manifest: Manifest = {
    deviceId: "dev-test",
    version: "v-fw-1",
    generatedAt: new Date().toISOString(),
    overBudget: false,
    totalBytes: fwSet.totalSize,
    sets: [fwSet],
    warnings: [],
  };

  const mockClient = {
    downloadFile: async (fileId: string, destPath: string) => {
      await fs.mkdir(dirname(destPath), { recursive: true });
      if (fileId === "fw-boot-id") {
        await fs.writeFile(destPath, bootContent, "utf-8");
      } else if (fileId === "fw-flash-id") {
        await fs.writeFile(destPath, flashContent, "utf-8");
      }
    },
  } as unknown as ApiClient;

  try {
    const initialState: CliState = await loadState(statePath);
    const plan = await createSyncPlan(manifest, initialState, dummyConfig);
    assertEquals(plan.toInstall.length, 1);
    assertEquals(plan.toInstall[0].filesToDownload.length, 2);

    const execResult = await executeSyncPlan(
      plan,
      manifest,
      initialState,
      statePath,
      dummyConfig,
      mockClient
    );
    assertEquals(execResult.installedCount, 1);
    assertEquals(execResult.failedCount, 0);

    // Verify files landed directly under biosDir/dc/... without double bios/ prefix
    const installedBoot = path.join(biosDir, "dc", "dc_boot.bin");
    const installedFlash = path.join(biosDir, "dc", "dc_flash.bin");
    assertEquals((await fs.stat(installedBoot)).isFile(), true);
    assertEquals((await fs.stat(installedFlash)).isFile(), true);

    // Verify re-planning is idempotent (no updates or conflicts)
    const reloadedState = await loadState(statePath);
    const secondPlan = await createSyncPlan(manifest, reloadedState, dummyConfig);
    assertEquals(secondPlan.toInstall.length, 0);
    assertEquals(secondPlan.toUpdate.length, 0);
    assertEquals(secondPlan.conflicts.length, 0);
    assertEquals(secondPlan.unchangedCount, 1);

    // Verify removal cleans up both firmware files
    const emptyManifest: Manifest = { ...manifest, version: "v-fw-2", sets: [] };
    const removePlan = await createSyncPlan(emptyManifest, reloadedState, dummyConfig);
    assertEquals(removePlan.toRemove.length, 1);

    const removeResult = await executeSyncPlan(
      removePlan,
      emptyManifest,
      reloadedState,
      statePath,
      dummyConfig,
      mockClient
    );
    assertEquals(removeResult.removedCount, 1);
    assertEquals(removeResult.failedCount, 0);

    let bootExists = true;
    try {
      await fs.stat(installedBoot);
    } catch {
      bootExists = false;
    }
    assertEquals(bootExists, false);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
