import { assertEquals } from "@repo/tests/utils/assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  saveConfig,
  loadConfig,
  getDefaultPaths,
  type CliConfig,
} from "../../../apps/cli/src/config.ts";

test("cli config: saves and loads with 0600 mode", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-config-test-"));
  const configPath = `${tempDir}/config.json`;

  const dummyConfig: CliConfig = {
    server: "http://localhost:8000",
    apiKey: "rmg_test_key_12345",
    deviceId: "dev-12345",
    preset: "batocera",
    paths: getDefaultPaths("batocera"),
    sync: {
      concurrency: 2,
      deleteMode: "trash",
      trashRetentionDays: 14,
      minFreeBytes: 1000000,
    },
    saves: {
      enabled: true,
      include: ["*.srm"],
      debounceSeconds: 30,
    },
    hooks: {
      postSync: "echo synced",
    },
  };

  try {
    const saved = await saveConfig(dummyConfig, configPath);
    assertEquals(saved, configPath);

    // Verify file mode on Linux
    const stat = await fs.stat(configPath);
    if (stat.mode !== null) {
      // 0o600 is 384 in decimal
      assertEquals(stat.mode & 0o777, 0o600);
    }

    const loaded = await loadConfig(configPath);
    assertEquals(loaded.server, "http://localhost:8000");
    assertEquals(loaded.apiKey, "rmg_test_key_12345");
    assertEquals(loaded.paths.roms, "/userdata/roms");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
