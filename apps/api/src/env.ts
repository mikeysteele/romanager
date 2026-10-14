import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface LoadEnvOptions {
  cwd?: string;
  envPaths?: string[];
  override?: boolean;
}

/**
 * Resolves candidate .env file paths based on CWD, apps/api directory, and repository root.
 */
export function getDefaultEnvPaths(cwd: string = process.cwd()): string[] {
  return [
    resolve(cwd, ".env"),
    resolve(__dirname, "../.env"),
    resolve(__dirname, "../../../.env"),
  ];
}

/**
 * Loads environment variables from .env files synchronously without top-level module side effects.
 * Searches candidate paths and loads them into process.env.
 *
 * @param options Configuration options for loading environment files
 * @returns Array of loaded .env file paths that existed and were processed
 */
export function loadEnv(options: LoadEnvOptions = {}): string[] {
  const cwd = options.cwd ?? process.cwd();
  const envPaths = options.envPaths ?? getDefaultEnvPaths(cwd);
  const override = options.override ?? false;
  const loadedPaths: string[] = [];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      if (override) {
        const content = fs.readFileSync(envPath, "utf-8");
        const parsed = dotenv.parse(content);
        for (const [k, v] of Object.entries(parsed)) {
          process.env[k] = v;
        }
        loadedPaths.push(envPath);
      } else if (typeof process.loadEnvFile === "function") {
        try {
          process.loadEnvFile(envPath);
          loadedPaths.push(envPath);
        } catch {
          dotenv.config({ path: envPath, override: false });
          loadedPaths.push(envPath);
        }
      } else {
        dotenv.config({ path: envPath, override: false });
        loadedPaths.push(envPath);
      }
    }
  }

  return loadedPaths;
}
