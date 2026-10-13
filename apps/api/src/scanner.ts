import { open } from "node:fs/promises";
import type { Rom } from "@repo/shared";
import { scanRomsWithSets } from "./scanner-sets.ts";

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
        const file = await open(filePath, "r");
        try {
            const maxBytesNeeded = Math.max(...magicRules.map(r => Math.ceil(r.magicNumber!.replace(/\s+/g, '').length / 2)));
            const headerBuffer = new Uint8Array(maxBytesNeeded);
            const { bytesRead } = await file.read(headerBuffer, 0, maxBytesNeeded, 0);
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
            await file.close();
        }
    } catch (_err) {
        return false;
    }
}

export async function scanRoms(rootDir: string, onProgress?: (info: { count: number, currentFile: string }) => void): Promise<Rom[]> {
  return await scanRomsWithSets(rootDir, onProgress);
}
