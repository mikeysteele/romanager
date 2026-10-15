import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { crc32 as zlibCrc32 } from "node:zlib";

export function computeCrc32(bytes: Uint8Array): string {
  const crc = zlibCrc32(bytes);
  return (crc >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export async function calculateFileHashes(filePath: string): Promise<{
  sha1: string;
  md5: string;
  crc32: string;
  size: number;
  mtime: number;
}> {
  const fileStat = await stat(filePath);
  const sha1Hash = createHash("sha1");
  const md5Hash = createHash("md5");

  let currentCrc: number | undefined = undefined;
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    const uint8Chunk = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    sha1Hash.update(uint8Chunk);
    md5Hash.update(uint8Chunk);
    currentCrc = currentCrc === undefined ? zlibCrc32(uint8Chunk) : zlibCrc32(uint8Chunk, currentCrc);
  }

  const sha1 = sha1Hash.digest("hex");
  const md5 = md5Hash.digest("hex");
  const crc32 = ((currentCrc ?? 0) >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const mtime = fileStat.mtime ? fileStat.mtime.getTime() : Date.now();

  return { sha1, md5, crc32, size: fileStat.size, mtime };
}

export function calculateSetHash(files: Array<{ relPath: string; sha1?: string | null }>): string {
  const sorted = [...files].sort((a, b) => a.relPath.localeCompare(b.relPath));
  const payload = sorted.map(f => `${f.relPath}:${f.sha1 || ""}`).join("\n");
  return createHash("sha1").update(payload).digest("hex");
}
