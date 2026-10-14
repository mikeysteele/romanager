import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

export function computeCrc32(bytes: Uint8Array): string {
  let crc = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
  }
  return ((crc ^ (-1)) >>> 0).toString(16).toUpperCase().padStart(8, "0");
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

  let crc = 0 ^ (-1);
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    const uint8Chunk = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    sha1Hash.update(uint8Chunk);
    md5Hash.update(uint8Chunk);
    for (let i = 0; i < uint8Chunk.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ uint8Chunk[i]) & 0xFF];
    }
  }

  const sha1 = sha1Hash.digest("hex");
  const md5 = md5Hash.digest("hex");
  const crc32 = ((crc ^ (-1)) >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const mtime = fileStat.mtime ? fileStat.mtime.getTime() : Date.now();

  return { sha1, md5, crc32, size: fileStat.size, mtime };
}

export function calculateSetHash(files: Array<{ relPath: string; sha1?: string | null }>): string {
  const sorted = [...files].sort((a, b) => a.relPath.localeCompare(b.relPath));
  const payload = sorted.map(f => `${f.relPath}:${f.sha1 || ""}`).join("\n");
  return createHash("sha1").update(payload).digest("hex");
}
