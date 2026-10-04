import { createHash } from "node:crypto";
import { dirname } from "@std/path";
import { ensureDir } from "@std/fs";
import type { Manifest } from "@repo/shared";
import type { CliConfig } from "./config.ts";
import { AuthError, ServerUnreachableError } from "./errors.ts";

export interface DeviceMeResponse {
  device: {
    id: string;
    name: string;
    preset: string;
    storageBudgetBytes: number | null;
    lastSeenAt: string | null;
    lastSyncAt: string | null;
  };
  profile: {
    deviceId: string;
    regionPreference: string;
    oneRomPerGame: boolean;
    includeFirmware: boolean;
  } | null;
  serverVersion: string;
}

export class ApiClient {
  private serverUrl: string;
  private apiKey: string;

  constructor(config: Pick<CliConfig, "server" | "apiKey">) {
    this.serverUrl = config.server.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.serverUrl}${path}`;
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${this.apiKey}`);

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (res.status === 401 || res.status === 403) {
        throw new AuthError(`Authentication rejected by server (${res.status}): ${url}`);
      }

      return res;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new ServerUnreachableError(`Cannot connect to Romanager server at ${this.serverUrl}: ${e}`);
    }
  }

  async getDeviceMe(): Promise<DeviceMeResponse> {
    const res = await this.request("/api/devices/me");
    if (!res.ok) {
      throw new Error(`Failed to fetch device details: ${res.statusText}`);
    }
    return (await res.json()) as DeviceMeResponse;
  }

  async getManifest(
    cachedEtag?: string
  ): Promise<{ notModified: boolean; manifest?: Manifest; etag?: string }> {
    const headers: Record<string, string> = {};
    if (cachedEtag) {
      headers["If-None-Match"] = cachedEtag;
    }

    const res = await this.request("/api/devices/me/manifest", { headers });

    if (res.status === 304) {
      return { notModified: true };
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch manifest: ${res.status} ${res.statusText}`);
    }

    const etag = res.headers.get("etag") || undefined;
    const manifest = (await res.json()) as Manifest;
    return { notModified: false, manifest, etag };
  }

  async postReport(report: {
    agentVersion: string;
    freeDiskBytes?: number;
    lastSyncSummary?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.request("/api/devices/me/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
    } catch {
      // Non-fatal if heartbeat fails
    }
  }

  async downloadFile(
    fileId: string,
    destPath: string,
    expectedSha1: string,
    onProgress?: (bytes: number) => void
  ): Promise<void> {
    await ensureDir(dirname(destPath));
    const partPath = `${destPath}.part`;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        let hasher = createHash("sha1");
        let startByte = 0;

        // Check if partial file exists
        try {
          const stat = await Deno.stat(partPath);
          if (stat.size > 0) {
            startByte = stat.size;
            // Pre-hash existing partial content
            const existingFile = await Deno.open(partPath, { read: true });
            const buf = new Uint8Array(64 * 1024);
            while (true) {
              const n = await existingFile.read(buf);
              if (n === null || n === 0) break;
              hasher.update(buf.subarray(0, n));
            }
            existingFile.close();
          }
        } catch {
          startByte = 0;
        }

        const headers: Record<string, string> = {};
        if (startByte > 0) {
          headers["Range"] = `bytes=${startByte}-`;
        }

        const res = await this.request(`/api/sync/files/${fileId}`, { headers });

        if (res.status === 416) {
          // Range out of bounds or corrupted partial, restart from 0
          try {
            await Deno.remove(partPath);
          } catch {
            // ignore
          }
          continue;
        }

        if (!res.ok && res.status !== 206) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        // If server returned 200 instead of 206, start from scratch
        const appendMode = res.status === 206 && startByte > 0;
        const file = await Deno.open(partPath, {
          write: true,
          create: true,
          append: appendMode,
          truncate: !appendMode,
        });

        if (!appendMode) {
          // Re-initialize hasher if not appending
          hasher = createHash("sha1");
        }

        const reader = res.body?.getReader();
        if (!reader) {
          file.close();
          throw new Error("Empty response body");
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              await file.write(value);
              hasher.update(value);
              if (onProgress) {
                onProgress(value.length);
              }
            }
          }
        } finally {
          file.close();
        }

        // Verify SHA-1
        const actualSha1 = hasher.digest("hex");
        if (expectedSha1 && actualSha1.toLowerCase() !== expectedSha1.toLowerCase()) {
          throw new Error(
            `SHA-1 mismatch: expected ${expectedSha1}, got ${actualSha1}`
          );
        }

        // Atomic move into final position
        await Deno.rename(partPath, destPath);
        return; // Success!
      } catch (e) {
        if (e instanceof AuthError) throw e;
        try {
          await Deno.remove(partPath);
        } catch {
          // ignore
        }
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to download ${destPath} after ${maxAttempts} attempts: ${e}`);
        }
      }
    }
  }
}
