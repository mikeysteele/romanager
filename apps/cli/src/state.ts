import { dirname, resolve } from "node:path";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { getDefaultConfigPath } from "./config.ts";

export interface StateFileRecord {
  sha1: string;
  size: number;
  mtime: number;
}

export interface StateSetRecord {
  kind: "rom" | "firmware";
  setHash: string;
  requires: string[];
  launchPath: string;
  files: Record<string, StateFileRecord>;
  syncedAt: string;
}

export interface StateSaveRecord {
  sha1: string;
  mtime: number;
  pushedAt: string;
}

export interface CliState {
  schema: number;
  manifestVersion: string;
  sets: Record<string, StateSetRecord>;
  saves: Record<string, StateSaveRecord>;
}

export function getStatePath(configPath?: string): string {
  const targetConfig = configPath ? resolve(configPath) : getDefaultConfigPath();
  return resolve(dirname(targetConfig), "state.json");
}

export async function loadState(statePath: string): Promise<CliState> {
  try {
    const raw = await readFile(statePath, "utf-8");
    return JSON.parse(raw) as CliState;
  } catch {
    return {
      schema: 1,
      manifestVersion: "",
      sets: {},
      saves: {},
    };
  }
}

export async function saveState(state: CliState, statePath: string): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  const tempPath = `${statePath}.tmp.${Date.now()}`;
  const json = JSON.stringify(state, null, 2);

  // Write to temporary file first, then atomically rename
  await writeFile(tempPath, json, { mode: 0o600 });
  await rename(tempPath, statePath);
}
