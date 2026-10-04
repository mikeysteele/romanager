import { walk } from "@std/fs";
import { normalize as normalizePath } from "@std/path";
import { db } from "./db/index.ts";
import { roms, scannedFiles, fileTypeWhitelist } from "./db/schema.ts";
import { eq, inArray } from "drizzle-orm";
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

import { scanRomsWithSets } from "./scanner-sets.ts";

export async function scanRoms(rootDir: string, onProgress?: (info: { count: number, currentFile: string }) => void): Promise<Rom[]> {
  return await scanRomsWithSets(rootDir, onProgress);
}

