import { walk } from "@std/fs";
import { normalize as normalizePath } from "@std/path";
import { db } from "./db/index.ts";
import { roms, scannedFiles } from "./db/schema.ts";
import { eq } from "drizzle-orm";
import type { Rom } from "@repo/shared";

interface FoundRom {
    filename: string;
    path: string;
    size: number;
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

  let count = 0;
  for await (const entry of walk(rootDir, { includeDirs: false })) {
    count++;
    if (onProgress) onProgress({ count, currentFile: entry.name });

    // Skip if not an extension we care about? 
    // For now accept all files or filter by common rom extensions if needed.
    
    foundRoms.push({
        filename: entry.name,
        path: normalizePath(entry.path),
        size: (await Deno.stat(entry.path)).size,
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
