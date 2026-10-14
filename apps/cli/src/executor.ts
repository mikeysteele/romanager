import { dirname, resolve } from "node:path";
import { mkdir, link, copyFile, cp, rename, rm, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Manifest } from "@repo/shared";
import type { CliConfig } from "./config.ts";
import { saveState, type CliState, type StateSetRecord } from "./state.ts";
import { type SyncPlan, getFreeDiskBytes } from "./planner.ts";
import type { ApiClient } from "./api-client.ts";
import { calculateFileSha1 } from "./hasher.ts";
import { InsufficientDiskSpaceError, PartialSyncError } from "./errors.ts";

const execFileAsync = promisify(execFile);

export interface SyncResult {
  installedCount: number;
  updatedCount: number;
  removedCount: number;
  failedCount: number;
  conflictsCount: number;
  errors: string[];
}

export async function executeSyncPlan(
  plan: SyncPlan,
  manifest: Manifest,
  state: CliState,
  statePath: string,
  config: CliConfig,
  apiClient: ApiClient,
  options: {
    dryRun?: boolean;
    onProgress?: (msg: string) => void;
  } = {}
): Promise<SyncResult> {
  const result: SyncResult = {
    installedCount: 0,
    updatedCount: 0,
    removedCount: 0,
    failedCount: 0,
    conflictsCount: plan.conflicts.length,
    errors: [],
  };

  const log = (msg: string) => {
    if (options.onProgress) options.onProgress(msg);
  };

  if (plan.insufficientSpace) {
    throw new InsufficientDiskSpaceError(
      `Insufficient disk space: requires ${plan.totalBytesToDownload} bytes, but only ${plan.availableDiskBytes} bytes are available (minimum free reserved: ${config.sync.minFreeBytes || 1073741824} bytes).`
    );
  }

  if (options.dryRun) {
    result.installedCount = plan.toInstall.length;
    result.updatedCount = plan.toUpdate.length;
    result.removedCount = plan.toRemove.length;
    return result;
  }

  // 1. Removals first (Section 8.1)
  for (const item of plan.toRemove) {
    try {
      log(`Removing set: ${item.key}`);
      const rootDir = item.record.kind === "firmware" ? config.paths.bios : config.paths.roms;
      for (const relPath of Object.keys(item.record.files)) {
        const fullPath = resolve(rootDir, relPath);
        await removeFileOrTrash(fullPath, item.key, config);
      }
      delete state.sets[item.key];
      await saveState(state, statePath);
      result.removedCount++;
    } catch (e) {
      result.failedCount++;
      result.errors.push(`Failed to remove ${item.key}: ${e}`);
    }
  }

  // 2. Installs and Updates (Atomic Staging Protocol)
  const itemsToProcess = [...plan.toInstall, ...plan.toUpdate];

  for (const item of itemsToProcess) {
    const set = item.set;
    const isUpdate = item.action === "update";
    const key = `${set.kind}:${set.id}`;
    const rootDir = set.kind === "firmware" ? config.paths.bios : config.paths.roms;
    const stagingDir = resolve(rootDir, ".romanager-staging", `${set.kind}-${set.id}`);

    log(`${isUpdate ? "Updating" : "Installing"} set: ${set.name} (${set.id})`);

    try {
      await mkdir(stagingDir, { recursive: true });

      // If updating, hardlink or copy existing unchanged member files into staging
      if (isUpdate && state.sets[key]) {
        for (const f of set.files) {
          const needsDownload = item.filesToDownload.some((d) => d.id === f.id);
          if (!needsDownload) {
            const currentInstalledPath = resolve(rootDir, f.path);
            const stagedTarget = resolve(stagingDir, f.path);
            await mkdir(dirname(stagedTarget), { recursive: true });
            try {
              await link(currentInstalledPath, stagedTarget);
            } catch {
              await copyFile(currentInstalledPath, stagedTarget);
            }
          }
        }
      }

      // Download needed files into staging
      for (const f of item.filesToDownload) {
        const stagedTarget = resolve(stagingDir, f.path);
        await apiClient.downloadFile(f.id, stagedTarget, f.sha1, (_bytes) => {
          // progress callback if needed
        });
      }

      // Verify all staged files
      for (const f of set.files) {
        const stagedTarget = resolve(stagingDir, f.path);
        const actualSha1 = await calculateFileSha1(stagedTarget);
        if (f.sha1 && actualSha1.toLowerCase() !== f.sha1.toLowerCase()) {
          throw new Error(
            `Verification failed for ${f.path}: expected ${f.sha1}, got ${actualSha1}`
          );
        }
      }

      // Commit into place atomically
      if (set.setType === "directory") {
        const targetDir = resolve(rootDir, dirname(set.launchPath));
        // Move staged dir into target dir
        await mkdir(dirname(targetDir), { recursive: true });
        try {
          await rename(stagingDir, targetDir);
        } catch {
          // Fallback if renaming across boundaries
          await cp(stagingDir, targetDir, { recursive: true, force: true });
          await rm(stagingDir, { recursive: true, force: true });
        }
      } else {
        // Non-launch files first!
        const launchFileObj = set.files.find((f) => f.path === set.launchPath) || set.files[0];
        const nonLaunchFiles = set.files.filter((f) => f.path !== launchFileObj.path);

        for (const f of nonLaunchFiles) {
          const stagedPath = resolve(stagingDir, f.path);
          const destPath = resolve(rootDir, f.path);
          await mkdir(dirname(destPath), { recursive: true });
          await rename(stagedPath, destPath);
        }

        // Launch file LAST!
        const stagedLaunch = resolve(stagingDir, launchFileObj.path);
        const destLaunch = resolve(rootDir, launchFileObj.path);
        await mkdir(dirname(destLaunch), { recursive: true });
        await rename(stagedLaunch, destLaunch);
      }

      // Clean staging dir
      try {
        await rm(stagingDir, { recursive: true, force: true });
      } catch {
        // ignore
      }

      // Record set in state.json
      const fileRecords: StateSetRecord["files"] = {};
      for (const f of set.files) {
        const fullPath = resolve(rootDir, f.path);
        let mtime = Date.now();
        try {
          const s = await stat(fullPath);
          if (s.mtime) mtime = s.mtime.getTime();
        } catch {
          // fallback
        }
        fileRecords[f.path] = {
          sha1: f.sha1,
          size: f.size,
          mtime,
        };
      }

      state.sets[key] = {
        kind: set.kind,
        setHash: set.setHash,
        requires: set.requires || [],
        launchPath: set.launchPath,
        files: fileRecords,
        syncedAt: new Date().toISOString(),
      };

      await saveState(state, statePath);

      if (isUpdate) {
        result.updatedCount++;
      } else {
        result.installedCount++;
      }
    } catch (e) {
      result.failedCount++;
      result.errors.push(`Failed set ${set.name}: ${e}`);
      // Clean up staging on failure
      try {
        await rm(stagingDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }

  // Update manifestVersion in state
  state.manifestVersion = manifest.version;
  await saveState(state, statePath);

  // 3. PostSync Hook if changes were made
  const changed = result.installedCount > 0 || result.updatedCount > 0 || result.removedCount > 0;
  if (changed && config.hooks.postSync) {
    try {
      log(`Running postSync hook: ${config.hooks.postSync}`);
      await execFileAsync("sh", ["-c", config.hooks.postSync]);
    } catch (e) {
      log(`Warning: postSync hook failed: ${e}`);
    }
  }

  // 4. Report to server
  try {
    const freeDiskBytes = await getFreeDiskBytes(config.paths.roms);
    await apiClient.postReport({
      agentVersion: "1.0.0",
      freeDiskBytes: freeDiskBytes || undefined,
      lastSyncSummary: {
        installed: result.installedCount,
        updated: result.updatedCount,
        removed: result.removedCount,
        failed: result.failedCount,
        conflicts: result.conflictsCount,
      },
    });
  } catch {
    // non-fatal
  }

  if (result.failedCount > 0) {
    throw new PartialSyncError(`Sync partially completed with ${result.failedCount} error(s).`);
  }

  return result;
}

async function removeFileOrTrash(filePath: string, setId: string, config: CliConfig): Promise<void> {
  try {
    if (config.sync.deleteMode === "never") {
      return;
    }

    if (config.sync.deleteMode === "trash") {
      const today = new Date().toISOString().slice(0, 10);
      const trashDir = resolve(config.paths.roms, ".romanager-trash", today, setId);
      await mkdir(trashDir, { recursive: true });
      const target = resolve(trashDir, filePath.split("/").pop() || "file");
      await rename(filePath, target);
      return;
    }

    // Default: "delete"
    await rm(filePath, { force: true });
  } catch {
    // file might already be gone
  }
}
