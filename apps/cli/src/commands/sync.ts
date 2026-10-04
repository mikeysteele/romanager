import { loadConfig } from "../config.ts";
import { loadState, getStatePath } from "../state.ts";
import { ApiClient } from "../api-client.ts";
import { createSyncPlan, type SyncPlan } from "../planner.ts";
import { executeSyncPlan } from "../executor.ts";

export interface SyncCommandOptions {
  configPath?: string;
  dryRun?: boolean;
  system?: string;
  only?: "roms" | "bios" | "saves";
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

export async function runSync(options: SyncCommandOptions): Promise<void> {
  const config = await loadConfig(options.configPath);
  const statePath = getStatePath(options.configPath || "");
  const state = await loadState(statePath);
  const client = new ApiClient(config);

  // 1. Fetch manifest
  const manifestRes = await client.getManifest(options.dryRun ? undefined : state.manifestVersion);

  if (manifestRes.notModified) {
    if (options.json) {
      console.log(JSON.stringify({ status: "up-to-date", changes: 0 }, null, 2));
    } else if (!options.quiet) {
      console.log("Local collection is up to date (ETag 304).");
    }
    return;
  }

  const manifest = manifestRes.manifest!;

  // 2. Build sync plan
  const plan = await createSyncPlan(manifest, state, config, {
    system: options.system,
    only: options.only,
  });

  // 3. If plan / dry-run requested, output and exit
  if (options.dryRun) {
    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      printPlanSummary(plan);
    }
    return;
  }

  // 4. Execute sync
  const result = await executeSyncPlan(plan, manifest, state, statePath, config, client, {
    dryRun: false,
    onProgress: (msg) => {
      if (!options.quiet) console.log(msg);
    },
  });

  if (options.json) {
    console.log(JSON.stringify({ status: "ok", result }, null, 2));
  } else if (!options.quiet) {
    console.log(`\nSync completed:`);
    console.log(`  Installed: ${result.installedCount} set(s)`);
    console.log(`  Updated:   ${result.updatedCount} set(s)`);
    console.log(`  Removed:   ${result.removedCount} set(s)`);
    if (result.conflictsCount > 0) {
      console.log(`  Conflicts: ${result.conflictsCount} set(s) skipped`);
    }
  }
}

export function printPlanSummary(plan: SyncPlan): void {
  console.log(`=== Romanager Sync Plan ===\n`);

  if (plan.toInstall.length > 0) {
    console.log(`To Install (${plan.toInstall.length} sets):`);
    for (const item of plan.toInstall) {
      console.log(`  + [${item.set.esFolder}] ${item.set.name} (${formatBytes(item.bytesToDownload)})`);
    }
    console.log("");
  }

  if (plan.toUpdate.length > 0) {
    console.log(`To Update (${plan.toUpdate.length} sets):`);
    for (const item of plan.toUpdate) {
      console.log(`  ~ [${item.set.esFolder}] ${item.set.name} (${formatBytes(item.bytesToDownload)})`);
    }
    console.log("");
  }

  if (plan.toRemove.length > 0) {
    console.log(`To Remove (${plan.toRemove.length} sets):`);
    for (const item of plan.toRemove) {
      console.log(`  - ${item.record.launchPath} (${formatBytes(item.totalBytes)})`);
    }
    console.log("");
  }

  if (plan.conflicts.length > 0) {
    console.log(`Conflicts / Skipped (${plan.conflicts.length} sets):`);
    for (const conf of plan.conflicts) {
      const name = "name" in conf.set ? conf.set.name : conf.set.launchPath;
      console.log(`  ! ${name}: ${conf.reason}`);
      for (const p of conf.paths) {
        console.log(`      path: ${p}`);
      }
    }
    console.log("");
  }

  console.log(`Summary:`);
  console.log(`  Download:  ${formatBytes(plan.totalBytesToDownload)}`);
  console.log(`  Remove:    ${formatBytes(plan.totalBytesToRemove)}`);
  console.log(`  Unchanged: ${plan.unchangedCount} sets`);
  if (plan.availableDiskBytes !== null) {
    console.log(`  Disk Free: ${formatBytes(plan.availableDiskBytes)}`);
  }
  if (plan.insufficientSpace) {
    console.log(`  [WARNING] Insufficient disk space for this sync operation!`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
