import { normalize as normalizePath, dirname, basename, relative, join } from "node:path";
import { readdir, stat } from "node:fs/promises";

async function* walk(dir: string, options?: { includeDirs?: boolean; followSymlinks?: boolean }): AsyncGenerator<{ path: string; name: string; isDirectory: boolean }> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const isDir = entry.isDirectory();
      if (isDir) {
        if (options?.includeDirs) {
          yield { path: fullPath, name: entry.name, isDirectory: true };
        }
        yield* walk(fullPath, options);
      } else {
        yield { path: fullPath, name: entry.name, isDirectory: false };
      }
    }
  } catch {
    // Directory might be inaccessible or removed
  }
}
import { db } from "./db/index.ts";
import {
  roms,
  scannedFiles,
  scannedSets,
  scannedSetFiles,
  fileTypeWhitelist
} from "./db/schema.ts";
import { eq, and } from "drizzle-orm";
import type { Rom } from "@repo/shared";
import { seedDefaultFileTypeWhitelist, DEFAULT_FILE_TYPES } from "./db/queries.ts";
import { verifyFileAgainstWhitelist } from "./scanner.ts";
import { parseCueFile, parseGdiFile, parseM3uFile } from "./set-parser.ts";
import { calculateFileHashes, calculateSetHash } from "./hasher.ts";

export const DIRECTORY_SET_EXTENSIONS = [".ps3", ".pc", ".scummvm", ".wiiu", ".squashfs", ".dosbox"];

export interface DiscoveredFile {
  path: string;
  filename: string;
  dir: string;
  size: number;
}

export interface SetMemberFile {
  relPath: string;
  path: string;
  filename: string;
  size: number;
  role: "launch" | "track" | "disc" | "descriptor" | "aux";
  sha1?: string;
  md5?: string;
  crc32?: string;
  mtime?: number;
  exists: boolean;
}

export interface DiscoveredSet {
  name: string;
  setType: "single" | "cue" | "gdi" | "m3u" | "directory";
  basePath: string;
  launchFile: string;
  totalSize: number;
  status: "complete" | "incomplete";
  files: SetMemberFile[];
  setHash?: string;
}

/**
 * Group raw discovered files in a directory into logical sets.
 */
export async function groupDirectoryFiles(dir: string, files: DiscoveredFile[]): Promise<DiscoveredSet[]> {
  const sets: DiscoveredSet[] = [];
  const claimedPaths = new Set<string>();

  const fileMap = new Map<string, DiscoveredFile>();
  for (const f of files) {
    fileMap.set(f.path, f);
  }

  // 1. Process .m3u sets
  const m3uFiles = files.filter(f => f.filename.toLowerCase().endsWith(".m3u"));
  for (const m3u of m3uFiles) {
    try {
      const parsed = await parseM3uFile(m3u.path);
      claimedPaths.add(m3u.path);

      const memberFiles: SetMemberFile[] = [
        {
          relPath: m3u.filename,
          path: m3u.path,
          filename: m3u.filename,
          size: m3u.size,
          role: "descriptor",
          exists: true,
        }
      ];

      let isComplete = parsed.isComplete;
      for (const pFile of parsed.files) {
        if (!pFile.resolvedPath) {
          isComplete = false;
          memberFiles.push({
            relPath: pFile.relPath,
            path: `${dir}/${pFile.relPath}`,
            filename: basename(pFile.relPath),
            size: 0,
            role: pFile.role,
            exists: false,
          });
        } else {
          claimedPaths.add(pFile.resolvedPath);
          const fInfo = fileMap.get(pFile.resolvedPath);
          let sz = fInfo ? fInfo.size : 0;
          if (!sz) {
            try {
              const fStat = await stat(pFile.resolvedPath);
              sz = fStat.size;
            } catch {
              sz = 0;
            }
          }
          memberFiles.push({
            relPath: relative(dir, pFile.resolvedPath).replace(/\\/g, "/"),
            path: pFile.resolvedPath,
            filename: basename(pFile.resolvedPath),
            size: sz,
            role: pFile.role,
            exists: true,
          });
        }
      }

      const totalSize = memberFiles.reduce((acc, f) => acc + f.size, 0);
      sets.push({
        name: m3u.filename.replace(/\.m3u$/i, ""),
        setType: "m3u",
        basePath: dir,
        launchFile: m3u.filename,
        totalSize,
        status: isComplete ? "complete" : "incomplete",
        files: memberFiles,
      });
    } catch (e) {
      console.warn("[Scanner] Error parsing .m3u %s:", m3u.path, e);
    }
  }

  // 2. Process .gdi sets
  const gdiFiles = files.filter(f => !claimedPaths.has(f.path) && f.filename.toLowerCase().endsWith(".gdi"));
  for (const gdi of gdiFiles) {
    try {
      const parsed = await parseGdiFile(gdi.path);
      claimedPaths.add(gdi.path);

      const memberFiles: SetMemberFile[] = [
        {
          relPath: gdi.filename,
          path: gdi.path,
          filename: gdi.filename,
          size: gdi.size,
          role: "launch",
          exists: true,
        }
      ];

      let isComplete = parsed.isComplete;
      for (const pFile of parsed.files) {
        if (!pFile.resolvedPath) {
          isComplete = false;
          memberFiles.push({
            relPath: pFile.relPath,
            path: `${dir}/${pFile.relPath}`,
            filename: basename(pFile.relPath),
            size: 0,
            role: pFile.role,
            exists: false,
          });
        } else {
          claimedPaths.add(pFile.resolvedPath);
          const fInfo = fileMap.get(pFile.resolvedPath);
          let sz = fInfo ? fInfo.size : 0;
          if (!sz) {
            try {
              const fStat = await stat(pFile.resolvedPath);
              sz = fStat.size;
            } catch {
              sz = 0;
            }
          }
          memberFiles.push({
            relPath: relative(dir, pFile.resolvedPath).replace(/\\/g, "/"),
            path: pFile.resolvedPath,
            filename: basename(pFile.resolvedPath),
            size: sz,
            role: pFile.role,
            exists: true,
          });
        }
      }

      const totalSize = memberFiles.reduce((acc, f) => acc + f.size, 0);
      sets.push({
        name: gdi.filename.replace(/\.gdi$/i, ""),
        setType: "gdi",
        basePath: dir,
        launchFile: gdi.filename,
        totalSize,
        status: isComplete ? "complete" : "incomplete",
        files: memberFiles,
      });
    } catch (e) {
      console.warn("[Scanner] Error parsing .gdi %s:", gdi.path, e);
    }
  }

  // 3. Process .cue sets
  const cueFiles = files.filter(f => !claimedPaths.has(f.path) && f.filename.toLowerCase().endsWith(".cue"));
  for (const cue of cueFiles) {
    try {
      const parsed = await parseCueFile(cue.path);
      claimedPaths.add(cue.path);

      const memberFiles: SetMemberFile[] = [
        {
          relPath: cue.filename,
          path: cue.path,
          filename: cue.filename,
          size: cue.size,
          role: "launch",
          exists: true,
        }
      ];

      let isComplete = parsed.isComplete;
      for (const pFile of parsed.files) {
        if (!pFile.resolvedPath) {
          isComplete = false;
          memberFiles.push({
            relPath: pFile.relPath,
            path: `${dir}/${pFile.relPath}`,
            filename: basename(pFile.relPath),
            size: 0,
            role: pFile.role,
            exists: false,
          });
        } else {
          claimedPaths.add(pFile.resolvedPath);
          const fInfo = fileMap.get(pFile.resolvedPath);
          let sz = fInfo ? fInfo.size : 0;
          if (!sz) {
            try {
              const fStat = await stat(pFile.resolvedPath);
              sz = fStat.size;
            } catch {
              sz = 0;
            }
          }
          memberFiles.push({
            relPath: relative(dir, pFile.resolvedPath).replace(/\\/g, "/"),
            path: pFile.resolvedPath,
            filename: basename(pFile.resolvedPath),
            size: sz,
            role: pFile.role,
            exists: true,
          });
        }
      }

      const totalSize = memberFiles.reduce((acc, f) => acc + f.size, 0);
      sets.push({
        name: cue.filename.replace(/\.cue$/i, ""),
        setType: "cue",
        basePath: dir,
        launchFile: cue.filename,
        totalSize,
        status: isComplete ? "complete" : "incomplete",
        files: memberFiles,
      });
    } catch (e) {
      console.warn("[Scanner] Error parsing .cue %s:", cue.path, e);
    }
  }

  // 4. Remaining unclaimed files become single sets
  const leftovers = files.filter(f => !claimedPaths.has(f.path));
  for (const file of leftovers) {
    sets.push({
      name: file.filename.substring(0, file.filename.lastIndexOf(".")) || file.filename,
      setType: "single",
      basePath: dir,
      launchFile: file.filename,
      totalSize: file.size,
      status: "complete",
      files: [
        {
          relPath: file.filename,
          path: file.path,
          filename: file.filename,
          size: file.size,
          role: "launch",
          exists: true,
        }
      ],
    });
  }

  return sets;
}

/**
 * Scan directory tree and group into ROM sets.
 */
export async function scanRomsWithSets(
  rootDir: string,
  onProgress?: (info: { count: number; currentFile: string }) => void
): Promise<Rom[]> {
  console.log(`[Scanner] Starting set-aware scan on ${rootDir}...`);

  try {
    await stat(rootDir);
  } catch (_e) {
    console.error(`[Scanner] Directory ${rootDir} does not exist.`);
    return [];
  }

  // Load whitelist
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

  // Step 1: Walk directory and classify files & directory sets
  const directorySets: DiscoveredSet[] = [];
  const filesByDir = new Map<string, DiscoveredFile[]>();
  let totalWalked = 0;
  let lastProgressEmitTime = 0;

  for await (const entry of walk(rootDir, { includeDirs: true, followSymlinks: false })) {
    const normPath = normalizePath(entry.path);

    // Check if this entry is inside an already recognized directory set
    const isInsideDirSet = directorySets.some(ds => normPath.startsWith(ds.basePath + "/"));
    if (isInsideDirSet) continue;

    if (entry.isDirectory) {
      const dirLower = entry.name.toLowerCase();
      const isDirSet = DIRECTORY_SET_EXTENSIONS.some(ext => dirLower.endsWith(ext));
      if (isDirSet) {
        // Collect all files inside this directory set
        const setFiles: SetMemberFile[] = [];
        let totalSize = 0;
        try {
          for await (const subEntry of walk(normPath, { includeDirs: false })) {
            const subNorm = normalizePath(subEntry.path);
            const sStat = await stat(subNorm);
            totalSize += sStat.size;
            setFiles.push({
              relPath: relative(normPath, subNorm).replace(/\\/g, "/"),
              path: subNorm,
              filename: subEntry.name,
              size: sStat.size,
              role: "aux",
              exists: true,
            });
          }
        } catch (e) {
          console.error("[Scanner] Error reading directory set %s:", normPath, e);
        }

        if (setFiles.length > 0) {
          // Designate the first file or an executable/descriptor as launch
          setFiles[0].role = "launch";
          directorySets.push({
            name: entry.name,
            setType: "directory",
            basePath: normPath,
            launchFile: entry.name,
            totalSize,
            status: "complete",
            files: setFiles,
          });
        }
      }
      continue;
    }

    // It's a file
    totalWalked++;
    const now = Date.now();
    if (onProgress && (totalWalked === 1 || now - lastProgressEmitTime >= 100)) {
      lastProgressEmitTime = now;
      onProgress({ count: totalWalked, currentFile: entry.name });
    }

    const isWhitelisted = await verifyFileAgainstWhitelist(normPath, entry.name, activeWhitelist);
    if (!isWhitelisted) continue;

    let size = 0;
    try {
      const fStat = await stat(normPath);
      size = fStat.size;
    } catch {
      continue;
    }

    const dir = dirname(normPath);
    if (!filesByDir.has(dir)) {
      filesByDir.set(dir, []);
    }
    filesByDir.get(dir)!.push({
      path: normPath,
      filename: entry.name,
      dir,
      size,
    });
  }

  if (onProgress && totalWalked > 0) {
    onProgress({ count: totalWalked, currentFile: "Discovered files" });
  }

  // Step 2: Group loose files in each directory into sets
  const allDiscoveredSets: DiscoveredSet[] = [...directorySets];
  for (const [dir, dirFiles] of filesByDir.entries()) {
    const grouped = await groupDirectoryFiles(dir, dirFiles);
    allDiscoveredSets.push(...grouped);
  }

  // Step 3: Check existing ROMs and staging records to filter already imported/staged sets
  const newlyStaged: Rom[] = [];

  for (const dSet of allDiscoveredSets) {
    const launchPath = `${dSet.basePath}/${dSet.launchFile}`;

    // Check if launch file or paths already exist in DB
    const [existingRom, existingScannedSet, existingScannedFile] = await Promise.all([
      db.select({ id: roms.id }).from(roms).where(eq(roms.path, launchPath)).get(),
      db.select({ id: scannedSets.id }).from(scannedSets).where(and(eq(scannedSets.basePath, dSet.basePath), eq(scannedSets.launchFile, dSet.launchFile))).get(),
      db.select({ id: scannedFiles.id }).from(scannedFiles).where(eq(scannedFiles.path, launchPath)).get(),
    ]);

    if (existingRom || existingScannedSet || existingScannedFile) {
      continue;
    }

    // Step 4: Hash files in this new set
    for (const file of dSet.files) {
      if (file.exists && !file.sha1) {
        try {
          const hashes = await calculateFileHashes(file.path);
          file.sha1 = hashes.sha1;
          file.md5 = hashes.md5;
          file.crc32 = hashes.crc32;
          file.mtime = hashes.mtime;
        } catch (e) {
          console.warn("[Scanner] Could not calculate hashes for %s:", file.path, e);
        }
      }
    }

    const setHash = calculateSetHash(dSet.files);
    dSet.setHash = setHash;

    const setId = crypto.randomUUID();

    // Insert into scanned_sets
    await db.insert(scannedSets).values({
      id: setId,
      name: dSet.name,
      setType: dSet.setType,
      basePath: dSet.basePath,
      launchFile: dSet.launchFile,
      totalSize: dSet.totalSize,
      setHash,
      status: dSet.status,
      ignored: false,
    }).onConflictDoNothing();

    // Insert into scanned_set_files
    for (const file of dSet.files) {
      if (!file.exists) continue;
      await db.insert(scannedSetFiles).values({
        id: crypto.randomUUID(),
        setId,
        relPath: file.relPath,
        path: file.path,
        filename: file.filename,
        size: file.size,
        sha1: file.sha1,
        md5: file.md5,
        crc32: file.crc32,
        role: file.role,
        mtime: file.mtime,
      }).onConflictDoNothing();

      // Mirror into scanned_files for backward-compatible unmapped queries and tests
      await db.insert(scannedFiles).values({
        id: crypto.randomUUID(),
        path: file.path,
        filename: file.filename,
        size: file.size,
        ignored: false,
        setId,
        setType: dSet.setType,
        role: file.role,
        status: dSet.status,
        sha1: file.sha1,
        md5: file.md5,
        crc32: file.crc32,
      }).onConflictDoNothing();
    }

    const launchFileObj = dSet.files.find(f => f.role === "launch") || dSet.files[0];
    newlyStaged.push({
      id: setId,
      systemId: "",
      filename: dSet.launchFile,
      path: launchPath,
      size: dSet.totalSize,
      totalSize: dSet.totalSize,
      setType: dSet.setType,
      setHash,
      status: dSet.status,
      sha1: launchFileObj?.sha1,
    });
  }

  console.log(`[Scanner] Scan completed. Discovered ${totalWalked} files, staged ${newlyStaged.length} sets.`);
  return newlyStaged;
}
