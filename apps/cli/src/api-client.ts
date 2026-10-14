import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { dirname } from "node:path";
import { mkdir, open, stat, rm, rename } from "node:fs/promises";
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

  async getManifest(ifNoneMatch?: string): Promise<{ notModified: boolean; manifest: Manifest | null }> {
    const headers: Record<string, string> = {};
    if (ifNoneMatch) {
      headers["If-None-Match"] = `"${ifNoneMatch}"`;
    }
    const res = await this.request("/api/devices/me/manifest", { headers });
    if (res.status === 304) {
      return { notModified: true, manifest: null };
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch manifest: ${res.statusText}`);
    }
    const manifest = (await res.json()) as Manifest;
    return { notModified: false, manifest };
  }

  async postReport(report: {
    agentVersion: string;
    freeDiskBytes?: number;
    lastSyncSummary: {
      installed: number;
      updated: number;
      removed: number;
      failed: number;
      conflicts: number;
    };
  }): Promise<void> {
    await this.request("/api/devices/me/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
  }

  async downloadFile(
    fileId: string,
    destPath: string,
    expectedSha1?: string | null,
    onProgress?: (bytes: number) => void
  ): Promise<void> {
    await mkdir(dirname(destPath), { recursive: true });
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
          const s = await stat(partPath);
          if (s.size > 0) {
            startByte = s.size;
            // Pre-hash existing partial content
            await new Promise<void>((resolveHash, rejectHash) => {
              const stream = createReadStream(partPath);
              stream.on("data", (chunk) => hasher.update(chunk));
              stream.on("end", () => resolveHash());
              stream.on("error", rejectHash);
            });
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
            await rm(partPath, { force: true });
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
        const fileHandle = await open(partPath, appendMode ? "a" : "w");

        if (!appendMode) {
          // Re-initialize hasher if not appending
          hasher = createHash("sha1");
        }

        const reader = res.body?.getReader();
        if (!reader) {
          await fileHandle.close();
          throw new Error("Empty response body");
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              await fileHandle.write(value);
              hasher.update(value);
              if (onProgress) {
                onProgress(value.length);
              }
            }
          }
        } finally {
          await fileHandle.close();
        }

        // Verify SHA-1
        const actualSha1 = hasher.digest("hex");
        if (expectedSha1 && actualSha1.toLowerCase() !== expectedSha1.toLowerCase()) {
          throw new Error(
            `SHA-1 mismatch: expected ${expectedSha1}, got ${actualSha1}`
          );
        }

        // Atomic move into final position
        await rename(partPath, destPath);
        return; // Success!
      } catch (e) {
        if (e instanceof AuthError) throw e;
        try {
          await rm(partPath, { force: true });
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
