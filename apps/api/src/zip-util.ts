import { inflateRawSync, deflateRawSync, crc32 as zlibCrc32 } from "node:zlib";
import path from "node:path";

export interface ExtractedZipEntry {
  filename: string;
  data: Buffer;
}

/**
 * Checks whether the buffer starts with the standard PKZip magic bytes.
 */
export function isZipFile(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

/**
 * Sanitizes a zip entry relative path to prevent Zip Slip directory traversal vulnerabilities.
 */
export function sanitizeZipEntryPath(rawName: string): string | null {
  // Replace backslashes with forward slashes
  let normalized = rawName.replace(/\\/g, "/");

  // Remove leading slashes
  normalized = normalized.replace(/^\/+/, "");

  // Prevent dot-dot navigation
  const parts = normalized.split("/").filter((part) => part.length > 0 && part !== ".");
  if (parts.some((part) => part === "..")) {
    return null;
  }

  // Filter out macOS metadata and hidden resource forks
  if (parts.some((p) => p === "__MACOSX" || p === ".DS_Store" || p.startsWith("._"))) {
    return null;
  }

  return parts.join("/");
}

/**
 * Extracts entries from a ZIP archive buffer using pure Node.js standard library (node:zlib).
 */
export function extractZipEntries(buf: Buffer): ExtractedZipEntry[] {
  // Find End of Central Directory record (EOCD signature 0x06054b50) scanning backwards from end
  let eocdOffset = -1;
  const minEocdLen = 22;
  const maxCommentLen = 65535;
  const startSearch = Math.max(0, buf.length - minEocdLen - maxCommentLen);

  for (let i = buf.length - minEocdLen; i >= startSearch; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP file: End of Central Directory record not found.");
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  const results: ExtractedZipEntry[] = [];
  let currOffset = cdOffset;

  for (let i = 0; i < totalEntries && currOffset < buf.length; i++) {
    const signature = buf.readUInt32LE(currOffset);
    if (signature !== 0x02014b50) {
      break;
    }

    const method = buf.readUInt16LE(currOffset + 10);
    const compSize = buf.readUInt32LE(currOffset + 20);
    const nameLen = buf.readUInt16LE(currOffset + 28);
    const extraLen = buf.readUInt16LE(currOffset + 30);
    const commentLen = buf.readUInt16LE(currOffset + 32);
    const localHeaderOffset = buf.readUInt32LE(currOffset + 42);

    const rawFilename = buf.toString("utf8", currOffset + 46, currOffset + 46 + nameLen);
    currOffset += 46 + nameLen + extraLen + commentLen;

    // Check directory flag
    if (rawFilename.endsWith("/")) {
      continue;
    }

    const cleanFilename = sanitizeZipEntryPath(rawFilename);
    if (!cleanFilename) {
      continue;
    }

    // Verify local header
    if (localHeaderOffset + 30 > buf.length) {
      throw new Error(`Corrupted ZIP file: Local header out of bounds for ${rawFilename}`);
    }
    const localSig = buf.readUInt32LE(localHeaderOffset);
    if (localSig !== 0x04034b50) {
      throw new Error(`Corrupted ZIP file: Invalid local header signature for ${rawFilename}`);
    }

    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

    if (dataOffset + compSize > buf.length) {
      throw new Error(`Corrupted ZIP file: Compressed data out of bounds for ${rawFilename}`);
    }

    const rawData = buf.subarray(dataOffset, dataOffset + compSize);
    let decompressed: Buffer;

    if (method === 0) {
      decompressed = Buffer.from(rawData);
    } else if (method === 8) {
      decompressed = inflateRawSync(rawData);
    } else {
      throw new Error(`Unsupported ZIP compression method (${method}) for entry ${rawFilename}`);
    }

    results.push({
      filename: cleanFilename,
      data: decompressed,
    });
  }

  return results;
}

/**
 * Creates a valid PKZip archive buffer in memory from entry objects.
 */
export function createZipArchive(entries: Array<{ filename: string; data: Buffer }>): Buffer {
  const parts: Buffer[] = [];
  const cdEntries: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filenameBuf = Buffer.from(entry.filename, "utf8");
    const compressed = deflateRawSync(entry.data);
    const crc = zlibCrc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8); // deflated
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc >>> 0, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0, 8);
    cdHeader.writeUInt16LE(8, 10);
    cdHeader.writeUInt16LE(0, 12);
    cdHeader.writeUInt16LE(0, 14);
    cdHeader.writeUInt32LE(crc >>> 0, 16);
    cdHeader.writeUInt32LE(compressed.length, 20);
    cdHeader.writeUInt32LE(entry.data.length, 24);
    cdHeader.writeUInt16LE(filenameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(offset, 42);

    parts.push(localHeader, filenameBuf, compressed);
    cdEntries.push(cdHeader, filenameBuf);
    offset += localHeader.length + filenameBuf.length + compressed.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const p of cdEntries) cdSize += p.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, ...cdEntries, eocd]);
}

