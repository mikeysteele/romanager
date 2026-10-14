import { dirname, resolve } from "node:path";
import fs from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import process from "node:process";

export type DevicePreset = "batocera" | "esde" | "retropie";

export interface CliConfig {
  server: string;
  apiKey: string;
  deviceId: string;
  preset: DevicePreset;
  paths: {
    roms: string;
    bios: string;
    saves: string;
  };
  sync: {
    concurrency: number;
    deleteMode: "trash" | "delete" | "never";
    trashRetentionDays: number;
    minFreeBytes: number;
    bandwidthLimitKbps?: number | null;
  };
  saves: {
    enabled: boolean;
    include: string[];
    debounceSeconds: number;
  };
  hooks: {
    postSync?: string | null;
  };
}

export function expandHome(pathStr: string): string {
  if (pathStr.startsWith("~")) {
    const home = process.env.HOME || "/root";
    return pathStr.replace(/^~/, home);
  }
  return pathStr;
}

export function detectPreset(): DevicePreset {
  try {
    if (fs.statSync("/userdata/system").isDirectory()) {
      return "batocera";
    }
  } catch {
    // not batocera
  }

  try {
    const home = process.env.HOME || "";
    if (
      fs.statSync("/opt/retropie").isDirectory() ||
      (home && fs.statSync(`${home}/RetroPie`).isDirectory())
    ) {
      return "retropie";
    }
  } catch {
    // not retropie
  }

  return "batocera"; // default fallback
}

export function getDefaultPaths(preset: DevicePreset): CliConfig["paths"] {
  switch (preset) {
    case "batocera":
      return {
        roms: "/userdata/roms",
        bios: "/userdata/bios",
        saves: "/userdata/saves",
      };
    case "retropie":
      return {
        roms: expandHome("~/RetroPie/roms"),
        bios: expandHome("~/RetroPie/BIOS"),
        saves: expandHome("~/RetroPie/roms"),
      };
    case "esde":
    default:
      return {
        roms: expandHome("~/ROMs"),
        bios: expandHome("~/.config/retroarch/system"),
        saves: expandHome("~/.config/retroarch/saves"),
      };
  }
}

export function getDefaultPostSyncHook(preset: DevicePreset): string | null {
  if (preset === "batocera") {
    return "curl -s http://localhost:1234/reloadgames";
  }
  return null;
}

export function getDefaultConfigPath(): string {
  const envPath = process.env.ROMANAGER_CONFIG;
  if (envPath) return resolve(envPath);

  try {
    if (fs.statSync("/userdata/system").isDirectory()) {
      return "/userdata/system/configs/romanager/config.json";
    }
  } catch {
    // fallback
  }

  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) {
    return resolve(xdg, "romanager/config.json");
  }

  const home = process.env.HOME || ".";
  return resolve(home, ".config/romanager/config.json");
}

export async function loadConfig(configPath?: string): Promise<CliConfig> {
  const targetPath = configPath ? resolve(configPath) : getDefaultConfigPath();
  try {
    const raw = await readFile(targetPath, "utf-8");
    return JSON.parse(raw) as CliConfig;
  } catch (e: any) {
    if (e.code === "ENOENT") {
      throw new Error(`Configuration file not found at ${targetPath}. Run 'romanager-sync init' first.`);
    }
    throw new Error(`Failed to read configuration at ${targetPath}: ${e}`);
  }
}

export async function saveConfig(config: CliConfig, configPath?: string): Promise<string> {
  const targetPath = configPath ? resolve(configPath) : getDefaultConfigPath();
  await mkdir(dirname(targetPath), { recursive: true });
  const json = JSON.stringify(config, null, 2);

  // Write with 0600 mode (read/write for owner only)
  await writeFile(targetPath, json, { mode: 0o600 });
  return targetPath;
}
