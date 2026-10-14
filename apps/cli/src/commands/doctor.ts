import { resolve } from "node:path";
import { stat, writeFile, rm, readdir } from "node:fs/promises";
import { loadConfig, getDefaultConfigPath } from "../config.ts";
import { ApiClient } from "../api-client.ts";
import { getFreeDiskBytes } from "../planner.ts";

export interface DoctorOptions {
  configPath?: string;
  json?: boolean;
}

export interface DoctorCheck {
  name: string;
  status: "ok" | "warn" | "fail";
  message: string;
}

export async function runDoctor(options: DoctorOptions): Promise<void> {
  const checks: DoctorCheck[] = [];
  const targetConfigPath = options.configPath || getDefaultConfigPath();

  // 1. Config check
  let config;
  try {
    config = await loadConfig(targetConfigPath);
    checks.push({
      name: "Configuration",
      status: "ok",
      message: `Valid configuration found at ${targetConfigPath}`,
    });
  } catch (e) {
    checks.push({
      name: "Configuration",
      status: "fail",
      message: `Failed to load config: ${e}`,
    });
  }

  // 2. Server & Auth check
  let client: ApiClient | null = null;
  if (config) {
    client = new ApiClient(config);
    try {
      const me = await client.getDeviceMe();
      checks.push({
        name: "Server & Auth",
        status: "ok",
        message: `Connected to ${config.server} (device: ${me.device.name}, version: ${me.serverVersion})`,
      });
    } catch (e) {
      checks.push({
        name: "Server & Auth",
        status: "fail",
        message: `Failed to authenticate with server: ${e}`,
      });
    }
  }

  // 3. Manifest check & warnings
  if (client) {
    try {
      const manifestRes = await client.getManifest();
      if (manifestRes.manifest) {
        if (manifestRes.manifest.warnings.length > 0) {
          checks.push({
            name: "Manifest",
            status: "warn",
            message: `Manifest has warnings: ${manifestRes.manifest.warnings.join("; ")}`,
          });
        } else {
          checks.push({
            name: "Manifest",
            status: "ok",
            message: `Resolved manifest successfully with ${manifestRes.manifest.sets.length} sets`,
          });
        }
      }
    } catch (e) {
      checks.push({
        name: "Manifest",
        status: "fail",
        message: `Could not retrieve manifest: ${e}`,
      });
    }
  }

  // 4. Directory paths and write permissions
  if (config) {
    for (const [key, dirPath] of Object.entries(config.paths)) {
      try {
        const s = await stat(dirPath);
        const isDir = typeof s.isDirectory === "function" ? s.isDirectory() : Boolean((s as any).isDirectory);
        if (!isDir) {
          checks.push({
            name: `Path (${key})`,
            status: "fail",
            message: `${dirPath} is not a directory`,
          });
          continue;
        }

        // Test write permission
        const testFile = resolve(dirPath, `.romanager-write-test-${Date.now()}`);
        await writeFile(testFile, "test");
        await rm(testFile, { force: true });

        checks.push({
          name: `Path (${key})`,
          status: "ok",
          message: `${dirPath} exists and is writable`,
        });
      } catch (e) {
        checks.push({
          name: `Path (${key})`,
          status: "warn",
          message: `Cannot access or write to ${dirPath}: ${e}`,
        });
      }
    }

    // 5. Free disk space
    try {
      const free = await getFreeDiskBytes(config.paths.roms);
      if (free !== null) {
        const minFree = config.sync.minFreeBytes || 1073741824;
        if (free < minFree) {
          checks.push({
            name: "Disk Space",
            status: "warn",
            message: `Low disk space on ROM partition: ${formatBytes(free)} available (min recommended: ${formatBytes(minFree)})`,
          });
        } else {
          checks.push({
            name: "Disk Space",
            status: "ok",
            message: `${formatBytes(free)} available on ROM partition`,
          });
        }
      }
    } catch {
      // ignore
    }

    // 6. Leftover staging directory check
    try {
      const stagingDir = resolve(config.paths.roms, ".romanager-staging");
      let count = 0;
      const entries = await readdir(stagingDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) count++;
      }
      if (count > 0) {
        checks.push({
          name: "Staging Area",
          status: "warn",
          message: `Found ${count} interrupted/leftover staging folder(s) in ${stagingDir}`,
        });
      } else {
        checks.push({
          name: "Staging Area",
          status: "ok",
          message: "No leftover staging directories found",
        });
      }
    } catch {
      // staging dir doesn't exist, which is good
      checks.push({
        name: "Staging Area",
        status: "ok",
        message: "Staging directory clean",
      });
    }
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify({ checks }, null, 2));
  } else {
    console.log("=== Romanager Companion Self-Test (Doctor) ===\n");
    for (const check of checks) {
      const tag =
        check.status === "ok"
          ? "[OK]  "
          : check.status === "warn"
          ? "[WARN]"
          : "[FAIL]";
      console.log(`${tag} ${check.name}: ${check.message}`);
    }
    console.log("");
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
