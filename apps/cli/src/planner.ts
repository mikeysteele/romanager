import { resolve } from "node:path";
import { stat, statfs } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Manifest, ManifestSet, ManifestFile } from "@repo/shared";
import type { CliConfig } from "./config.ts";
import type { CliState, StateSetRecord } from "./state.ts";
import { calculateFileSha1 } from "./hasher.ts";

const execFileAsync = promisify(execFile);

export interface PlanItem {
  set: ManifestSet;
  action: "install" | "update";
  filesToDownload: ManifestFile[];
  bytesToDownload: number;
}

export interface PlanConflict {
  set: ManifestSet | StateSetRecord;
  reason: string;
  paths: string[];
}

export interface SyncPlan {
  toInstall: PlanItem[];
  toUpdate: PlanItem[];
  toRemove: { key: string; record: StateSetRecord; totalBytes: number }[];
  conflicts: PlanConflict[];
  unchangedCount: number;
  totalBytesToDownload: number;
  totalBytesToRemove: number;
  availableDiskBytes: number | null;
  insufficientSpace: boolean;
}

export async function getFreeDiskBytes(dirPath: string): Promise<number | null> {
  try {
    const stats = await statfs(dirPath);
    return Number(stats.bfree) * Number(stats.bsize);
  } catch {
    // fallback to df command on unix
    try {
      const { stdout } = await execFileAsync("df", ["-B1", dirPath]);
      const lines = stdout.trim().split("\n");
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        if (parts.length >= 4) {
          return parseInt(parts[3], 10);
        }
      }
    } catch {
      // fallback
    }
  }
  return null;
}

export async function createSyncPlan(
  manifest: Manifest,
  state: CliState,
  config: CliConfig,
  options: {
    system?: string;
    only?: "roms" | "bios" | "saves";
  } = {}
): Promise<SyncPlan> {
  const toInstall: PlanItem[] = [];
  const toUpdate: PlanItem[] = [];
  const toRemove: { key: string; record: StateSetRecord; totalBytes: number }[] = [];
  const conflicts: PlanConflict[] = [];
  let unchangedCount = 0;

  // 1. Filter sets according to flags
  let sets = manifest.sets;
  if (options.only === "roms") {
    sets = sets.filter((s) => s.kind === "rom");
  } else if (options.only === "bios") {
    sets = sets.filter((s) => s.kind === "firmware");
  }

  if (options.system) {
    sets = sets.filter((s) => s.esFolder === options.system);
  }

  const manifestSetKeys = new Set<string>();

  // 2. Evaluate each manifest set
  for (const set of sets) {
    const key = `${set.kind}:${set.id}`;
    manifestSetKeys.add(key);

    const rootDir = set.kind === "firmware" ? config.paths.bios : config.paths.roms;
    const stateRecord = state.sets[key];

    if (!stateRecord) {
      // Set is NOT owned locally. Check for collision with existing unowned files
      const existingPaths: string[] = [];
      for (const f of set.files) {
        const fullPath = resolve(rootDir, f.path);
        try {
          const s = await stat(fullPath);
          const isFileOrDir = typeof s.isFile === "function" ? (s.isFile() || s.isDirectory()) : Boolean((s as any).isFile || (s as any).isDirectory);
          if (isFileOrDir) {
            existingPaths.push(f.path);
          }
        } catch {
          // target path free
        }
      }

      if (existingPaths.length > 0) {
        conflicts.push({
          set,
          reason: "Target path occupied by unmanaged local file(s). Use 'adopt' to claim them.",
          paths: existingPaths,
        });
      } else {
        toInstall.push({
          set,
          action: "install",
          filesToDownload: set.files,
          bytesToDownload: set.files.reduce((sum, f) => sum + f.size, 0),
        });
      }
    } else {
      // Set IS owned locally
      if (stateRecord.setHash === set.setHash) {
        // Unchanged set identity. Verify member files on disk
        const missingOrCorruptedFiles: ManifestFile[] = [];
        let hasConflict = false;
        const conflictPaths: string[] = [];

        for (const f of set.files) {
          const fullPath = resolve(rootDir, f.path);
          try {
            const s = await stat(fullPath);
            const recorded = stateRecord.files[f.path];
            if (
              !recorded ||
              s.size !== recorded.size ||
              (s.mtime && recorded.mtime && s.mtime.getTime() !== recorded.mtime)
            ) {
              const actualSha1 = await calculateFileSha1(fullPath);
              if (f.sha1 && actualSha1.toLowerCase() !== f.sha1.toLowerCase()) {
                hasConflict = true;
                conflictPaths.push(f.path);
              }
            }
          } catch {
            // File missing from disk, re-download
            missingOrCorruptedFiles.push(f);
          }
        }

        if (hasConflict) {
          conflicts.push({
            set,
            reason: "Owned set has locally modified files",
            paths: conflictPaths,
          });
        } else if (missingOrCorruptedFiles.length > 0) {
          toUpdate.push({
            set,
            action: "update",
            filesToDownload: missingOrCorruptedFiles,
            bytesToDownload: missingOrCorruptedFiles.reduce((sum, f) => sum + f.size, 0),
          });
        } else {
          unchangedCount++;
        }
      } else {
        // Set hash changed on server!
        // Check if any currently installed files were locally modified
        let hasConflict = false;
        const conflictPaths: string[] = [];

        for (const [relPath, rec] of Object.entries(stateRecord.files)) {
          const fullPath = resolve(rootDir, relPath);
          try {
            const s = await stat(fullPath);
            if (
              s.size !== rec.size ||
              (s.mtime && rec.mtime && s.mtime.getTime() !== rec.mtime)
            ) {
              const actualSha1 = await calculateFileSha1(fullPath);
              if (actualSha1.toLowerCase() !== rec.sha1.toLowerCase()) {
                hasConflict = true;
                conflictPaths.push(relPath);
              }
            }
          } catch {
            // missing is fine, will be updated
          }
        }

        if (hasConflict) {
          conflicts.push({
            set,
            reason: "Locally modified set cannot be updated cleanly",
            paths: conflictPaths,
          });
        } else {
          // Identify which files changed between stateRecord and new set
          const filesToDownload: ManifestFile[] = [];
          for (const f of set.files) {
            const recorded = stateRecord.files[f.path];
            if (!recorded || recorded.sha1.toLowerCase() !== (f.sha1 || "").toLowerCase()) {
              filesToDownload.push(f);
            } else {
              // verify it actually exists on disk
              try {
                await stat(resolve(rootDir, f.path));
              } catch {
                filesToDownload.push(f);
              }
            }
          }

          toUpdate.push({
            set,
            action: "update",
            filesToDownload,
            bytesToDownload: filesToDownload.reduce((sum, f) => sum + f.size, 0),
          });
        }
      }
    }
  }

  // 3. Evaluate owned sets for removal
  for (const [key, stateRecord] of Object.entries(state.sets)) {
    if (options.only === "roms" && stateRecord.kind !== "rom") continue;
    if (options.only === "bios" && stateRecord.kind !== "firmware") continue;
    if (options.system && stateRecord.kind === "rom") {
      if (!stateRecord.launchPath.startsWith(`${options.system}/`)) {
        continue;
      }
    }

    if (!manifestSetKeys.has(key)) {
      // Candidate for removal
      let locallyModified = false;
      const modifiedPaths: string[] = [];
      const rootDir = stateRecord.kind === "firmware" ? config.paths.bios : config.paths.roms;

      for (const [relPath, rec] of Object.entries(stateRecord.files)) {
        const fullPath = resolve(rootDir, relPath);
        try {
          const s = await stat(fullPath);
          if (
            s.size !== rec.size ||
            (s.mtime && rec.mtime && s.mtime.getTime() !== rec.mtime)
          ) {
            const actualSha1 = await calculateFileSha1(fullPath);
            if (actualSha1.toLowerCase() !== rec.sha1.toLowerCase()) {
              locallyModified = true;
              modifiedPaths.push(relPath);
            }
          }
        } catch {
          // missing is fine
        }
      }

      if (locallyModified) {
        conflicts.push({
          set: stateRecord,
          reason: "Locally modified set scheduled for removal; skipping to protect user changes",
          paths: modifiedPaths,
        });
      } else {
        const totalBytes = Object.values(stateRecord.files).reduce((sum, f) => sum + f.size, 0);
        toRemove.push({
          key,
          record: stateRecord,
          totalBytes,
        });
      }
    }
  }

  const totalBytesToDownload =
    toInstall.reduce((sum, i) => sum + i.bytesToDownload, 0) +
    toUpdate.reduce((sum, u) => sum + u.bytesToDownload, 0);

  const totalBytesToRemove = toRemove.reduce((sum, r) => sum + r.totalBytes, 0);

  const availableDiskBytes = await getFreeDiskBytes(config.paths.roms);
  const minFreeBytes = config.sync.minFreeBytes || 1073741824;
  const insufficientSpace =
    availableDiskBytes !== null && availableDiskBytes < totalBytesToDownload + minFreeBytes;

  return {
    toInstall,
    toUpdate,
    toRemove,
    conflicts,
    unchangedCount,
    totalBytesToDownload,
    totalBytesToRemove,
    availableDiskBytes,
    insufficientSpace,
  };
}
