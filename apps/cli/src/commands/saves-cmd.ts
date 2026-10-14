import { dirname, resolve, relative } from "node:path";
import { mkdir, readdir, stat, readFile, writeFile, copyFile } from "node:fs/promises";
import { loadConfig } from "../config.ts";
import { loadState, saveState, getStatePath } from "../state.ts";
import { calculateFileSha1 } from "../hasher.ts";

export interface SavesCommandOptions {
  action: "push" | "list" | "restore";
  targetPath?: string;
  system?: string;
  version?: string;
  force?: boolean;
  configPath?: string;
  json?: boolean;
}

export async function runSaves(options: SavesCommandOptions): Promise<void> {
  const config = await loadConfig(options.configPath);
  const statePath = getStatePath(options.configPath || "");
  const state = await loadState(statePath);

  const serverBase = config.server.replace(/\/+$/, "");

  // 1. LIST SAVES
  if (options.action === "list") {
    const res = await fetch(`${serverBase}/api/devices/me/saves`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to list saves: ${res.status} ${res.statusText}`);
    }

    let saves = (await res.json()) as Array<{
      id: string;
      relativePath: string;
      systemId: string | null;
      currentSha1: string | null;
      updatedAt: string;
      versionsCount: number;
      latestVersion: { size: number; deviceMtime: string } | null;
    }>;

    if (options.system) {
      saves = saves.filter((s) => s.relativePath.startsWith(`${options.system}/`));
    }

    if (options.json) {
      console.log(JSON.stringify(saves, null, 2));
      return;
    }

    console.log(`=== Remote Saves for Device (${saves.length} files) ===\n`);
    for (const s of saves) {
      const sizeStr = s.latestVersion ? formatBytes(s.latestVersion.size) : "0 B";
      console.log(`  • ${s.relativePath}`);
      console.log(`      Size: ${sizeStr} | Versions: ${s.versionsCount} | Updated: ${new Date(s.updatedAt).toLocaleString()}`);
    }
    return;
  }

  // 2. PUSH SAVES
  if (options.action === "push") {
    console.log(`[Saves] Scanning for save files in ${config.paths.saves}...`);
    const saveDirs = [config.paths.saves];
    const discovered: Array<{ fullPath: string; relPath: string }> = [];

    for (const dir of saveDirs) {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            // subfolder per system
            const subDir = resolve(dir, entry.name);
            const subEntries = await readdir(subDir, { withFileTypes: true });
            for (const subEntry of subEntries) {
              if (subEntry.isFile() && isSaveFile(subEntry.name)) {
                const fullPath = resolve(subDir, subEntry.name);
                const relPath = relative(config.paths.saves, fullPath).replace(/\\/g, "/");
                discovered.push({ fullPath, relPath });
              }
            }
          } else if (entry.isFile() && isSaveFile(entry.name)) {
            const fullPath = resolve(dir, entry.name);
            const relPath = entry.name;
            discovered.push({ fullPath, relPath });
          }
        }
      } catch {
        // directory not present yet
      }
    }

    let pushedCount = 0;
    let unchangedCount = 0;

    for (const item of discovered) {
      if (options.system && !item.relPath.startsWith(`${options.system}/`)) {
        continue;
      }

      const s = await stat(item.fullPath);
      const sha1 = await calculateFileSha1(item.fullPath);
      const mtime = s.mtime ? s.mtime.toISOString() : new Date().toISOString();

      const existingRecord = state.saves[item.relPath];
      if (existingRecord && existingRecord.sha1 === sha1) {
        unchangedCount++;
        continue;
      }

      console.log(`Pushing save: ${item.relPath}...`);
      const fileBytes = await readFile(item.fullPath);

      const url = `${serverBase}/api/devices/me/saves/${encodeURIComponent(item.relPath)}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/octet-stream",
          "X-Sha1": sha1,
          "X-Mtime": mtime,
        },
        body: fileBytes,
      });

      if (!res.ok) {
        console.error(`Failed to push ${item.relPath}: ${res.statusText}`);
        continue;
      }

      state.saves[item.relPath] = {
        sha1,
        mtime: s.mtime?.getTime() || Date.now(),
        pushedAt: new Date().toISOString(),
      };
      pushedCount++;
    }

    await saveState(state, statePath);
    console.log(`[Saves] Pushed: ${pushedCount} save(s), Unchanged: ${unchangedCount} save(s).`);
    return;
  }

  // 3. RESTORE SAVE
  if (options.action === "restore") {
    if (!options.targetPath) {
      throw new Error("Usage: romanager-sync saves restore <path> [--version V] [--force]");
    }

    const relPath = options.targetPath;
    const localPath = resolve(config.paths.saves, relPath);

    // Check if local file exists
    let localExists = false;
    try {
      await stat(localPath);
      localExists = true;

      if (!options.force) {
        // refusal check without force
        console.warn(`Local save file already exists at ${localPath}. Overwrite requires --force.`);
        return;
      }
    } catch {
      localExists = false;
    }

    const versionParam = options.version ? `?version=${encodeURIComponent(options.version)}` : "";
    const url = `${serverBase}/api/devices/me/saves/${encodeURIComponent(relPath)}${versionParam}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to download save: ${res.status} ${res.statusText}`);
    }

    // Always create a .bak backup of the existing local file
    if (localExists) {
      const backupPath = `${localPath}.bak`;
      console.log(`Backing up current local save to ${backupPath}...`);
      await copyFile(localPath, backupPath);
    }

    await mkdir(dirname(localPath), { recursive: true });
    const data = await res.arrayBuffer();
    await writeFile(localPath, new Uint8Array(data));

    const sha1 = res.headers.get("x-sha1") || "";
    state.saves[relPath] = {
      sha1,
      mtime: Date.now(),
      pushedAt: new Date().toISOString(),
    };
    await saveState(state, statePath);

    console.log(`Successfully restored save: ${localPath}`);
  }
}

function isSaveFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".srm") ||
    lower.endsWith(".sav") ||
    lower.endsWith(".mcd") ||
    lower.endsWith(".mcr") ||
    lower.includes(".state")
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
