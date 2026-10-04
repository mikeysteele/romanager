import { ApiClient } from "../api-client.ts";
import {
  saveConfig,
  detectPreset,
  getDefaultPaths,
  getDefaultPostSyncHook,
  type CliConfig,
  type DevicePreset,
} from "../config.ts";
import { ConfigError } from "../errors.ts";

export interface InitOptions {
  server?: string;
  key?: string;
  preset?: string;
  configPath?: string;
  json?: boolean;
}

export async function runInit(options: InitOptions): Promise<void> {
  const server = options.server;
  const apiKey = options.key;

  if (!server) {
    throw new ConfigError("Missing required flag: --server <URL>");
  }
  if (!apiKey) {
    throw new ConfigError("Missing required flag: --key <API_KEY>");
  }

  // 1. Verify key against server
  const client = new ApiClient({ server, apiKey });
  const me = await client.getDeviceMe();

  // 2. Determine preset
  const preset: DevicePreset = (options.preset as DevicePreset) || (me.device.preset as DevicePreset) || detectPreset();
  const paths = getDefaultPaths(preset);
  const postSync = getDefaultPostSyncHook(preset);

  // 3. Construct config
  const config: CliConfig = {
    server: server.replace(/\/+$/, ""),
    apiKey,
    deviceId: me.device.id,
    preset,
    paths,
    sync: {
      concurrency: 2,
      deleteMode: "trash",
      trashRetentionDays: 14,
      minFreeBytes: 1073741824,
    },
    saves: {
      enabled: true,
      include: ["*.srm", "*.sav", "*.state*", "*.mcd", "*.mcr"],
      debounceSeconds: 30,
    },
    hooks: {
      postSync,
    },
  };

  const savedPath = await saveConfig(config, options.configPath);

  if (options.json) {
    console.log(JSON.stringify({ status: "ok", device: me.device, configPath: savedPath }, null, 2));
  } else {
    console.log(`Successfully enrolled device '${me.device.name}' (ID: ${me.device.id})!`);
    console.log(`Preset: ${preset}`);
    console.log(`Config written to: ${savedPath}`);
    console.log(`ROMs directory: ${paths.roms}`);
    console.log(`BIOS directory: ${paths.bios}`);
    console.log(`Saves directory: ${paths.saves}`);
  }
}
