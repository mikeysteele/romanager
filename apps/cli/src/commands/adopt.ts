import { resolve } from "node:path";
import { stat } from "node:fs/promises";
import { loadConfig } from "../config.ts";
import { loadState, saveState, getStatePath } from "../state.ts";
import { ApiClient } from "../api-client.ts";
import { calculateFileSha1 } from "../hasher.ts";

export interface AdoptOptions {
  configPath?: string;
  system?: string;
  dryRun?: boolean;
  json?: boolean;
  quiet?: boolean;
}

export async function runAdopt(options: AdoptOptions): Promise<void> {
  const config = await loadConfig(options.configPath);
  const statePath = getStatePath(options.configPath || "");
  const state = await loadState(statePath);
  const client = new ApiClient(config);

  const manifestRes = await client.getManifest();
  if (!manifestRes.manifest) {
    throw new Error("Failed to retrieve manifest from server.");
  }

  const manifest = manifestRes.manifest;
  let sets = manifest.sets.filter((s) => !state.sets[`${s.kind}:${s.id}`]);

  if (options.system) {
    sets = sets.filter((s) => s.esFolder === options.system);
  }

  const adopted: Array<{ id: string; name: string; filesCount: number }> = [];

  for (const set of sets) {
    const rootDir = set.kind === "firmware" ? config.paths.bios : config.paths.roms;
    let allMatch = true;
    const fileStats: Record<string, { sha1: string; size: number; mtime: number }> = {};

    for (const f of set.files) {
      const fullPath = resolve(rootDir, f.path);
      try {
        const s = await stat(fullPath);
        if (s.size !== f.size) {
          allMatch = false;
          break;
        }

        const actualSha1 = await calculateFileSha1(fullPath);
        if (f.sha1 && actualSha1.toLowerCase() !== f.sha1.toLowerCase()) {
          allMatch = false;
          break;
        }

        fileStats[f.path] = {
          sha1: actualSha1,
          size: s.size,
          mtime: s.mtime?.getTime() || Date.now(),
        };
      } catch {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      adopted.push({ id: set.id, name: set.name, filesCount: set.files.length });
      if (!options.dryRun) {
        state.sets[`${set.kind}:${set.id}`] = {
          kind: set.kind,
          setHash: set.setHash,
          requires: set.requires || [],
          launchPath: set.launchPath,
          files: fileStats,
          syncedAt: new Date().toISOString(),
        };
      }
    }
  }

  if (!options.dryRun && adopted.length > 0) {
    await saveState(state, statePath);
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          adoptedCount: adopted.length,
          dryRun: !!options.dryRun,
          adopted,
        },
        null,
        2
      )
    );
  } else {
    if (options.dryRun) {
      console.log(`[DRY RUN] Found ${adopted.length} local set(s) matching server manifest:`);
    } else {
      console.log(`Adopted ${adopted.length} local set(s) into Romanager management:`);
    }
    for (const s of adopted) {
      console.log(`  + ${s.name} (${s.filesCount} files)`);
    }
  }
}
