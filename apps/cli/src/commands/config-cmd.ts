import { CliConfig, loadConfig, saveConfig } from "../config.ts";
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/**
 * Type-level path resolution: extracts the value type at dot-separated path `P` in `T`.
 */
export type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<Exclude<T[Key], Primitive>, Rest>
    : unknown
  : P extends keyof T
    ? T[P]
    : unknown;

/**
 * Disallowed prototype keys to prevent prototype pollution at runtime.
 */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
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
    const parsed = setNestedValue(config, key, parseValue(value));
    await saveConfig(parsed, configPath);
    console.log(`Updated '${key}' = ${value}`);
  }
}

function getNestedValue(obj: CliConfig | null | undefined, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function setNestedValue<T extends object, P extends string>(
  obj: T,
  path: P,
  value: PathValue<T, P>
): T;
export function setNestedValue<T extends object>(
  obj: T,
  path: string,
  value: unknown
): T;
export function setNestedValue(
  obj: object,
  path: string,
  value: unknown
): object {
  if (!isRecord(obj)) {
    throw new TypeError('Target must be a non-null object');
  }

  const keys = path.split('.').filter(Boolean);
  if (keys.length === 0) {
    return obj;
  }

  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`Unsafe key access: "${key}"`);
    }

    const next = current[key];
    if (!isRecord(next)) {
      const nextContainer: Record<string, unknown> = {};
      current[key] = nextContainer;
      current = nextContainer;
    } else {
      current = next;
    }
  }

  const leafKey = keys[keys.length - 1];
  if (FORBIDDEN_KEYS.has(leafKey)) {
    throw new Error(`Unsafe key access: "${leafKey}"`);
  }

  current[leafKey] = value;
  return obj;
}

function parseValue(val: string): unknown {
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;
  const num = Number(val);
  if (!isNaN(num) && val.trim() !== "") return num;
  return val;
}
