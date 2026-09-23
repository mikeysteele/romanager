import { walk } from "@std/fs";
import { normalize as normalizePath } from "@std/path";
import { db } from "./db/index.ts";
import { roms, scannedFiles, fileTypeWhitelist } from "./db/schema.ts";
import { eq } from "drizzle-orm";
import type { Rom } from "@repo/shared";
import { seedDefaultFileTypeWhitelist, DEFAULT_FILE_TYPES } from "./db/queries.ts";

interface FoundRom {
    filename: string;
    path: string;
    size: number;
}

export async function verifyFileAgainstWhitelist(
    filePath: string,
    filename: string,
    whitelist: Array<{ extension: string; magicNumber?: string | null }>
): Promise<boolean> {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext || ext === filename.toLowerCase()) {
        return false;
    }

    const matchingRules = whitelist.filter(rule => rule.extension.toLowerCase() === ext);
    if (matchingRules.length === 0) {
        return false;
    }

    // If any matching rule does not require a magic number, accept file
    const hasUnconditionalRule = matchingRules.some(rule => !rule.magicNumber);
    if (hasUnconditionalRule) {
        return true;
    }

    // All matching rules require a magic number.
    const magicRules = matchingRules.filter(rule => !!rule.magicNumber);
    if (magicRules.length === 0) return true;

    try {
        const file = await Deno.open(filePath, { read: true });
        try {
            const maxBytesNeeded = Math.max(...magicRules.map(r => Math.ceil(r.magicNumber!.replace(/\s+/g, '').length / 2)));
            const headerBuffer = new Uint8Array(maxBytesNeeded);
            const bytesRead = await file.read(headerBuffer);
            if (!bytesRead || bytesRead === 0) return false;

            for (const rule of magicRules) {
                const cleanHex = rule.magicNumber!.replace(/\s+/g, '').toUpperCase();
                const expectedBytes = new Uint8Array(cleanHex.length / 2);
                for (let i = 0; i < cleanHex.length; i += 2) {
                    expectedBytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
                }

                if (bytesRead >= expectedBytes.length) {
                    let matched = true;
                    for (let i = 0; i < expectedBytes.length; i++) {
                        if (headerBuffer[i] !== expectedBytes[i]) {
                            matched = false;
                            break;
                        }
                    }
                    if (matched) return true;
                }
            }
            return false;
        } finally {
            file.close();
        }
    } catch (_err) {
        return false;
    }
}

export async function scanRoms(rootDir: string, onProgress?: (info: { count: number, currentFile: string }) => void): Promise<Rom[]> {
  console.log(`Scanning ${rootDir}...`);
  
  const foundRoms: FoundRom[] = [];
  
  try {
    await Deno.stat(rootDir);
  } catch (_e) {
    console.error(`Directory ${rootDir} does not exist.`);
    return [];
  }

  // Load whitelist rules
  let activeWhitelist: Array<{ extension: string; magicNumber?: string | null }> = [];
  try {
    const fromDb = await db.select().from(fileTypeWhitelist).where(eq(fileTypeWhitelist.enabled, true));
    if (fromDb.length === 0) {
      await seedDefaultFileTypeWhitelist();
      activeWhitelist = await db.select().from(fileTypeWhitelist).where(eq(fileTypeWhitelist.enabled, true));
    } else {
      activeWhitelist = fromDb;
    }
  } catch (err) {
    console.warn("[Scanner] Failed to fetch file type whitelist from DB, using defaults:", err);
    activeWhitelist = DEFAULT_FILE_TYPES.map(t => ({ extension: t.extension, magicNumber: t.magicNumber }));
  }

  let count = 0;
  for await (const entry of walk(rootDir, { includeDirs: false })) {
    count++;
    if (onProgress) onProgress({ count, currentFile: entry.name });

    // Filter against file type whitelist & magic numbers
    const isWhitelisted = await verifyFileAgainstWhitelist(entry.path, entry.name, activeWhitelist);
    if (!isWhitelisted) {
      continue;
    }

    let size = 0;
    try {
        const info = await Deno.stat(entry.path);
        size = info.size;
    } catch (e) {
        if (e instanceof Deno.errors.FilesystemLoop) {
            console.warn(`[Scanner] Skipping circular symlink: ${entry.path}`);
            continue;
        }
        if (e instanceof Deno.errors.NotFound) {
            console.warn(`[Scanner] Skipping broken symlink or missing file: ${entry.path}`);
            continue;
        }
        console.error(`[Scanner] Unexpected error stating ${entry.path}:`, e);
        continue;
    }
    
    foundRoms.push({
        filename: entry.name,
        path: normalizePath(entry.path),
        size,
    });
  }


  console.log(`Processing ${foundRoms.length} files...`);

  await db.transaction(async (tx) => {
      for (const file of foundRoms) {
          // 1. Check if already in Library (roms table)
          const existingRom = await tx.select().from(roms).where(eq(roms.path, file.path)).get();
          if (existingRom) continue;

          // 2. Check if already in Scanned Files
          const existingScan = await tx.select().from(scannedFiles).where(eq(scannedFiles.path, file.path)).get();
          if (existingScan) continue;

          // 3. Insert into Scanned Files
          await tx.insert(scannedFiles).values({
              id: crypto.randomUUID(),
              path: file.path,
              filename: file.filename,
              size: file.size,
          });
      }
  });

  // Return empty array as we are no longer auto-importing
  return [];
}
