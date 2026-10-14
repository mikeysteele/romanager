import { assertEquals } from "@repo/tests/utils/assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadEnv, getDefaultEnvPaths } from "../../../apps/api/src/env.ts";

test("env: getDefaultEnvPaths includes cwd .env, apps/api .env, and root .env", () => {
  const customCwd = "/custom/workspace";
  const paths = getDefaultEnvPaths(customCwd);

  assertEquals(paths.length, 3);
  assertEquals(paths[0], path.resolve(customCwd, ".env"));
  assertEquals(paths[1].endsWith(path.join("apps", "api", ".env")), true);
  assertEquals(paths[2].toLowerCase().endsWith(path.join("romanager", ".env")), true);
});

test("env: loadEnv handles non-existent files gracefully without throwing", () => {
  const nonExistentPath = path.join(os.tmpdir(), "non-existent-" + Date.now() + ".env");
  const loaded = loadEnv({ envPaths: [nonExistentPath] });

  assertEquals(loaded, []);
});

test("env: loadEnv loads environment variables from existing .env file into process.env", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-env-test-"));
  const envFilePath = path.join(tmpDir, ".env");
  const testKey = "TEST_LOAD_ENV_KEY_" + Date.now();
  const testValue = "test_value_12345";

  try {
    await fs.writeFile(envFilePath, `${testKey}=${testValue}\n`, "utf-8");

    const loaded = loadEnv({ envPaths: [envFilePath] });

    assertEquals(loaded.includes(envFilePath), true);
    assertEquals(process.env[testKey], testValue);
  } finally {
    delete process.env[testKey];
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("env: loadEnv does not override existing env by default unless override is true", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "romanager-env-override-test-"));
  const envFilePath = path.join(tmpDir, ".env");
  const testKey = "TEST_OVERRIDE_KEY_" + Date.now();
  const initialValue = "initial";
  const fileValue = "from_file";

  process.env[testKey] = initialValue;

  try {
    await fs.writeFile(envFilePath, `${testKey}=${fileValue}\n`, "utf-8");

    // Without override
    loadEnv({ envPaths: [envFilePath], override: false });
    assertEquals(process.env[testKey], initialValue);

    // With override
    loadEnv({ envPaths: [envFilePath], override: true });
    assertEquals(process.env[testKey], fileValue);
  } finally {
    delete process.env[testKey];
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
