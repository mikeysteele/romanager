import { loadConfig, saveConfig } from "../config.ts";
import { ApiClient } from "../api-client.ts";

export async function runAuthSetKey(newKey: string, configPath?: string): Promise<void> {
  if (!newKey || !newKey.startsWith("rmg_")) {
    console.error("Invalid API key format. Expected 'rmg_...'");
    process.exit(1);
  }

  const config = await loadConfig(configPath);
  const client = new ApiClient({ server: config.server, apiKey: newKey });

  // Verify new key against server
  const me = await client.getDeviceMe();

  config.apiKey = newKey;
  config.deviceId = me.device.id;
  await saveConfig(config, configPath);

  console.log(`Successfully updated API key for device '${me.device.name}' (${me.device.id}).`);
}
