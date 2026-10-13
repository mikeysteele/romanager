import { test } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { UniversalWorker } from "../apps/api/src/worker-adapter.ts";

process.env.DB_URL = process.env.DB_URL || "file:test.db";

class DenoNotFound extends Error {
  code = "ENOENT";
  constructor(message?: string) {
    super(message || "File not found");
    this.name = "NotFound";
  }
}

function denoTest(
  nameOrOptionsOrFn: any,
  optionsOrFn?: any,
  maybeFn?: any
) {
  let name: string;
  let fn: Function;

  if (typeof nameOrOptionsOrFn === "string") {
    name = nameOrOptionsOrFn;
    if (typeof optionsOrFn === "function") {
      fn = optionsOrFn;
    } else if (typeof maybeFn === "function") {
      fn = maybeFn;
    } else {
      throw new Error(`Missing test function for "${name}"`);
    }
  } else if (typeof nameOrOptionsOrFn === "function") {
    name = nameOrOptionsOrFn.name || "anonymous test";
    fn = nameOrOptionsOrFn;
  } else if (typeof nameOrOptionsOrFn === "object" && nameOrOptionsOrFn !== null) {
    name = nameOrOptionsOrFn.name;
    fn = nameOrOptionsOrFn.fn;
  } else {
    throw new Error("Invalid Deno.test signature");
  }

  test(name, async () => {
    await fn();
  });
}

(globalThis as any).Deno = {
  test: denoTest,
  permissions: {
    querySync: () => ({ state: "granted" }),
    query: async () => ({ state: "granted" }),
    requestSync: () => ({ state: "granted" }),
    request: async () => ({ state: "granted" }),
  },
  env: {
    get: (key: string) => process.env[key],
    set: (key: string, val: string) => {
      process.env[key] = val;
    },
    delete: (key: string) => {
      delete process.env[key];
    },
    toObject: () => ({ ...process.env }),
  },
  cwd: () => process.cwd(),
  makeTempFile: async () => {
    const tmp = path.join(os.tmpdir(), `temp-${Math.random().toString(36).substring(2)}.tmp`);
    await fs.writeFile(tmp, "");
    return tmp;
  },
  makeTempDir: async () => {
    return await fs.mkdtemp(path.join(os.tmpdir(), "temp-dir-"));
  },
  writeTextFile: async (filePath: string, data: string, options?: { mode?: number }) => {
    await fs.writeFile(filePath, data, { encoding: "utf-8", mode: options?.mode });
  },
  readTextFile: async (filePath: string) => {
    return await fs.readFile(filePath, "utf-8");
  },
  writeFile: async (filePath: string, data: Uint8Array, options?: { mode?: number }) => {
    await fs.writeFile(filePath, data, { mode: options?.mode });
  },
  readFile: async (filePath: string) => {
    return await fs.readFile(filePath);
  },
  remove: async (filePath: string, options?: { recursive?: boolean }) => {
    await fs.rm(filePath, { recursive: Boolean(options?.recursive), force: true });
  },
  rename: async (oldPath: string, newPath: string) => {
    await fs.rename(oldPath, newPath);
  },
  copyFile: async (from: string, to: string) => {
    await fs.copyFile(from, to);
  },
  chmod: async (filePath: string, mode: number) => {
    await fs.chmod(filePath, mode);
  },
  mkdir: async (dirPath: string, options?: { recursive?: boolean }) => {
    await fs.mkdir(dirPath, { recursive: Boolean(options?.recursive) });
  },
  stat: async (p: string) => {
    try {
      const s = await fs.stat(p);
      return {
        ...s,
        isFile: s.isFile(),
        isDirectory: s.isDirectory(),
        size: s.size,
        mtime: s.mtime,
        mode: s.mode,
      };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw new DenoNotFound(err.message);
      }
      throw err;
    }
  },
  errors: {
    NotFound: DenoNotFound,
  },
};

if (typeof (globalThis as any).Worker === "undefined") {
  (globalThis as any).Worker = UniversalWorker;
}
