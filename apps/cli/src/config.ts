import { dirname, resolve } from "@std/path";
import { ensureDir } from "@std/fs";

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
    const home = Deno.env.get("HOME") || "/root";
    return pathStr.replace(/^~/, home);
  }
  return pathStr;
}

export function detectPreset(): DevicePreset {
  try {
    if (Deno.statSync("/userdata/system").isDirectory) {
      return "batocera";
    }
  } catch {
    // not batocera
  }

  try {
    const home = Deno.env.get("HOME") || "";
    if (
      Deno.statSync("/opt/retropie").isDirectory ||
      (home && Deno.statSync(`${home}/RetroPie`).isDirectory)
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
  const envPath = Deno.env.get("ROMANAGER_CONFIG");
  if (envPath) return resolve(envPath);

  try {
    if (Deno.statSync("/userdata/system").isDirectory) {
      return "/userdata/system/configs/romanager/config.json";
    }
  } catch {
    // fallback
  }

  const xdg = Deno.env.get("XDG_CONFIG_HOME");
  if (xdg) {
    return resolve(xdg, "romanager/config.json");
  }

  const home = Deno.env.get("HOME") || ".";
  return resolve(home, ".config/romanager/config.json");
}

export async function loadConfig(configPath?: string): Promise<CliConfig> {
  const targetPath = configPath ? resolve(configPath) : getDefaultConfigPath();
  try {
    const raw = await Deno.readTextFile(targetPath);
    return JSON.parse(raw) as CliConfig;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(`Configuration file not found at ${targetPath}. Run 'romanager-sync init' first.`);
    }
    throw new Error(`Failed to read configuration at ${targetPath}: ${e}`);
  }
}

export async function saveConfig(config: CliConfig, configPath?: string): Promise<string> {
  const targetPath = configPath ? resolve(configPath) : getDefaultConfigPath();
  await ensureDir(dirname(targetPath));
  const json = JSON.stringify(config, null, 2);

  // Write with 0600 mode (read/write for owner only)
  await Deno.writeTextFile(targetPath, json, { mode: 0o600 });
  return targetPath;
}
