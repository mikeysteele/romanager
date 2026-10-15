import { loadConfig } from "../config.ts";
import { loadState, getStatePath } from "../state.ts";
import { ApiClient } from "../api-client.ts";
import { createSyncPlan, getFreeDiskBytes } from "../planner.ts";

export interface StatusOptions {
  configPath?: string;
  json?: boolean;
}

export async function runStatus(options: StatusOptions): Promise<void> {
  const config = await loadConfig(options.configPath);
  const statePath = getStatePath(options.configPath);
  const state = await loadState(statePath);
  const client = new ApiClient(config);

  const me = await client.getDeviceMe();
  const manifestRes = await client.getManifest(state.manifestVersion);

  let pendingInstall = 0;
  let pendingUpdate = 0;
  let pendingRemove = 0;
  let conflictsCount = 0;

  if (!manifestRes.notModified && manifestRes.manifest) {
    const plan = await createSyncPlan(manifestRes.manifest, state, config);
    pendingInstall = plan.toInstall.length;
    pendingUpdate = plan.toUpdate.length;
    pendingRemove = plan.toRemove.length;
    conflictsCount = plan.conflicts.length;
  }

  const freeDisk = await getFreeDiskBytes(config.paths.roms);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          device: me.device,
          profile: me.profile,
          serverVersion: me.serverVersion,
          installedSetsCount: Object.keys(state.sets).length,
          manifestVersion: state.manifestVersion,
          pending: {
            install: pendingInstall,
            update: pendingUpdate,
            remove: pendingRemove,
            conflicts: conflictsCount,
          },
          freeDiskBytes: freeDisk,
        },
        null,
        2
      )
    );
  } else {
    console.log(`=== Romanager Sync Status ===`);
    console.log(`Server:         ${config.server} (v${me.serverVersion})`);
    console.log(`Device:         ${me.device.name} [${me.device.preset}] (${me.device.id})`);
    console.log(`Last Seen:      ${me.device.lastSeenAt || "Never"}`);
    console.log(`Last Sync:      ${me.device.lastSyncAt || "Never"}`);
    console.log(`Installed Sets: ${Object.keys(state.sets).length}`);
    console.log(`Free Disk:      ${freeDisk !== null ? formatBytes(freeDisk) : "Unknown"}`);
    console.log(`--- Pending Changes ---`);
    if (manifestRes.notModified) {
      console.log(`Manifest up to date (no pending changes).`);
    } else {
      console.log(`To Install:     ${pendingInstall} set(s)`);
      console.log(`To Update:      ${pendingUpdate} set(s)`);
      console.log(`To Remove:      ${pendingRemove} set(s)`);
      if (conflictsCount > 0) {
        console.log(`Conflicts:      ${conflictsCount} set(s) (use 'romanager-sync plan' for details)`);
      }
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
