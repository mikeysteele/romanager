import { loadConfig, saveConfig } from "../config.ts";

export async function runConfig(
  action: "get" | "set",
  key?: string,
  value?: string,
  configPath?: string
): Promise<void> {
  const config = await loadConfig(configPath);

  if (action === "get") {
    if (!key) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    const val = getNestedValue(config, key);
    if (val === undefined) {
      console.error(`Key '${key}' not found in configuration.`);
      Deno.exit(1);
    }
    console.log(typeof val === "object" ? JSON.stringify(val, null, 2) : String(val));
    return;
  }

  if (action === "set") {
    if (!key || value === undefined) {
      console.error("Usage: romanager-sync config set <key> <value>");
      Deno.exit(1);
    }
    setNestedValue(config, key, parseValue(value));
    await saveConfig(config, configPath);
    console.log(`Updated '${key}' = ${value}`);
  }
}

function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setNestedValue(obj: any, path: string, val: any): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur) || typeof cur[p] !== "object") {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = val;
}

function parseValue(val: string): any {
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;
  const num = Number(val);
  if (!isNaN(num) && val.trim() !== "") return num;
  return val;
}
