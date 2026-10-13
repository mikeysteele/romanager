import { db } from "./db/index.ts";
import {
  devices,
  deviceProfiles,
  profileRules,
  systems,
  roms,
  romFiles,
  systemFirmware,
} from "./db/schema.ts";
import { eq, and, asc } from "drizzle-orm";
import { createHash } from "node:crypto";
import { relative, basename } from "node:path";
import { stat as fsStat } from "node:fs/promises";
import type { Manifest, ManifestSet, ManifestFile } from "@repo/shared";
import { calculateSetHash } from "./hasher.ts";

export function calculateManifestVersion(sets: Array<{ id: string; setHash: string }>): string {
  const sorted = [...sets].sort((a, b) => a.id.localeCompare(b.id));
  const payload = sorted.map((s) => `${s.id}:${s.setHash}`).join("\n");
  return createHash("sha1").update(payload).digest("hex");
}

export async function generateManifest(deviceId: string): Promise<Manifest | null> {
  const device = await db.select().from(devices).where(eq(devices.id, deviceId)).get();
  if (!device) {
    return null;
  }

  const profile = (await db
    .select()
    .from(deviceProfiles)
    .where(eq(deviceProfiles.deviceId, deviceId))
    .get()) || {
    deviceId,
    regionPreference: "USA,EUR,JPN",
    oneRomPerGame: false,
    includeFirmware: true,
  };

  const rules = await db
    .select()
    .from(profileRules)
    .where(eq(profileRules.deviceId, deviceId))
    .orderBy(asc(profileRules.position));

  const allSystems = await db.select().from(systems);
  const systemMap = new Map<string, typeof allSystems[0]>();
  for (const s of allSystems) {
    systemMap.set(s.id, s);
  }

  const warnings: string[] = [];

  // Query all active ROMs
  const activeRoms = await db
    .select()
    .from(roms)
    .where(and(eq(roms.pendingDelete, false), eq(roms.status, "complete")));

  // Load rom_files grouped by romId
  const allRomFiles = await db.select().from(romFiles);
  const romFilesMap = new Map<string, typeof allRomFiles>();
  for (const rf of allRomFiles) {
    const list = romFilesMap.get(rf.romId) || [];
    list.push(rf);
    romFilesMap.set(rf.romId, list);
  }

  // Pre-filter systems without esFolder and warn
  const missingFolderSystemsWarned = new Set<string>();
  const candidateRoms: typeof activeRoms = [];

  for (const r of activeRoms) {
    if (!r.systemId) continue;
    const sys = systemMap.get(r.systemId);
    if (!sys || !sys.esFolder || sys.esFolder.trim() === "") {
      if (sys && !missingFolderSystemsWarned.has(sys.id)) {
        missingFolderSystemsWarned.add(sys.id);
        warnings.push(`System "${sys.name}" has no esFolder configured and was excluded from sync`);
      }
      continue;
    }

    const files = romFilesMap.get(r.id) || [];
    if (files.length === 0) {
      warnings.push(`ROM set "${r.name || r.filename}" has no files and was excluded`);
      continue;
    }

    candidateRoms.push(r);
  }

  // Evaluate inclusion rules
  const hasIncludeSystemRules = rules.some((r) => r.kind === "include_system");
  const hasAnyIncludeRules = rules.some((r) => r.kind.startsWith("include_"));
  const hasAnyExcludeRules = rules.some((r) => r.kind.startsWith("exclude_"));

  // Default inclusion state:
  // If there are include_system rules, base state is false.
  // Else if there are other include rules without exclude rules, base is false.
  // Otherwise, base state is true.
  const baseInclusion = !hasIncludeSystemRules && !(hasAnyIncludeRules && !hasAnyExcludeRules);

  const includedRoms: typeof activeRoms = [];
  for (const r of candidateRoms) {
    let included = baseInclusion;

    for (const rule of rules) {
      if (rule.kind === "include_system" && rule.targetId === r.systemId) {
        included = true;
      } else if (rule.kind === "exclude_system" && rule.targetId === r.systemId) {
        included = false;
      } else if (rule.kind === "include_game" && r.gameId && rule.targetId === r.gameId) {
        included = true;
      } else if (rule.kind === "exclude_game" && r.gameId && rule.targetId === r.gameId) {
        included = false;
      } else if (rule.kind === "include_rom" && rule.targetId === r.id) {
        included = true;
      } else if (rule.kind === "exclude_rom" && rule.targetId === r.id) {
        included = false;
      }
    }

    if (included) {
      includedRoms.push(r);
    }
  }

  // Apply oneRomPerGame deduplication if enabled
  let finalRoms = includedRoms;
  if (profile.oneRomPerGame) {
    const prefList = profile.regionPreference
      .split(",")
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);

    const grouped = new Map<string, typeof activeRoms>();
    const unmapped: typeof activeRoms = [];

    for (const r of includedRoms) {
      if (r.gameId && r.systemId) {
        const key = `${r.systemId}:${r.gameId}`;
        const list = grouped.get(key) || [];
        list.push(r);
        grouped.set(key, list);
      } else {
        unmapped.push(r);
      }
    }

    finalRoms = [...unmapped];
    for (const list of grouped.values()) {
      if (list.length === 1) {
        finalRoms.push(list[0]);
      } else {
        // Pick best based on region preference, then smallest totalSize, then name
        list.sort((a, b) => {
          const scoreA = getRegionScore(a.region, prefList);
          const scoreB = getRegionScore(b.region, prefList);
          if (scoreA !== scoreB) return scoreA - scoreB;
          if (a.totalSize !== b.totalSize) return a.totalSize - b.totalSize;
          return (a.name || "").localeCompare(b.name || "");
        });
        finalRoms.push(list[0]);
      }
    }
  }

  // Convert ROMs to ManifestSets
  const sets: ManifestSet[] = [];
  const claimedPaths = new Map<string, string>(); // launchPath -> setName

  for (const r of finalRoms) {
    const sys = systemMap.get(r.systemId!)!;
    const esFolder = sys.esFolder!;
    const files = romFilesMap.get(r.id)!;

    // Determine setRelDir on device
    let setRelDir = "";
    if (sys.path && r.basePath && r.basePath.startsWith(sys.path)) {
      const rel = relative(sys.path, r.basePath).replace(/\\/g, "/");
      if (rel && rel !== ".") {
        setRelDir = rel;
      }
    } else if (r.basePath) {
      const dir = basename(r.basePath);
      if (dir && dir !== esFolder) {
        setRelDir = dir;
      }
    }

    const manifestFiles: ManifestFile[] = files.map((f) => {
      const relPosix = setRelDir ? `${setRelDir}/${f.relPath}` : f.relPath;
      const devicePath = `${esFolder}/${relPosix}`.replace(/\/+/g, "/").replace(/^\//, "");
      return {
        id: f.id,
        path: devicePath,
        size: f.size,
        sha1: f.sha1 || "",
        role: (f.role as ManifestFile["role"]) || "launch",
      };
    });

    const relLaunch = setRelDir ? `${setRelDir}/${r.launchFile}` : r.launchFile;
    const launchPath = `${esFolder}/${relLaunch}`.replace(/\/+/g, "/").replace(/^\//, "");

    // Check path collision
    const existingSetName = claimedPaths.get(launchPath);
    if (existingSetName) {
      warnings.push(
        `Path collision: "${launchPath}" claimed by "${existingSetName}", skipping "${r.name || r.filename}"`
      );
      continue;
    }
    claimedPaths.set(launchPath, r.name || r.filename);

    const setHash =
      r.setHash ||
      calculateSetHash(files.map((f) => ({ relPath: f.relPath, sha1: f.sha1 || "" })));

    sets.push({
      kind: "rom",
      id: r.id,
      gameId: r.gameId,
      systemId: r.systemId!,
      esFolder,
      name: r.name || r.filename,
      setType: (r.setType as ManifestSet["setType"]) || "single",
      launchPath,
      setHash,
      totalSize: r.totalSize || manifestFiles.reduce((s, f) => s + f.size, 0),
      files: manifestFiles,
      requires: [],
      implicit: false,
    });
  }

  // Include firmware if requested
  if (profile.includeFirmware) {
    const includedSystemIds = new Set<string>();
    for (const s of sets) {
      if (s.kind === "rom") {
        includedSystemIds.add(s.systemId);
      }
    }

    for (const sysId of includedSystemIds) {
      const fws = await db
        .select()
        .from(systemFirmware)
        .where(eq(systemFirmware.systemId, sysId));

      for (const fw of fws) {
        const fwPath = `bios/${fw.filename}`.replace(/\/+/g, "/").replace(/^\//, "");
        if (claimedPaths.has(fwPath)) {
          continue;
        }
        claimedPaths.set(fwPath, fw.filename);

        let fwSize = 0;
        try {
          const stat = await fsStat(fw.path);
          fwSize = stat.size;
        } catch {
          // Keep 0 if file stat fails
        }

        const fwSha1 = fw.sha1 || "";
        const setHash = fwSha1 ? calculateSetHash([{ relPath: fw.filename, sha1: fwSha1 }]) : fw.id;

        sets.push({
          kind: "firmware",
          id: fw.id,
          gameId: null,
          systemId: fw.systemId,
          esFolder: "bios",
          name: fw.description || fw.filename,
          setType: "single",
          launchPath: fwPath,
          setHash,
          totalSize: fwSize,
          files: [
            {
              id: fw.id,
              path: fwPath,
              size: fwSize,
              sha1: fwSha1,
              role: "aux",
            },
          ],
          requires: [],
          implicit: false,
        });
      }
    }
  }

  // Check storage budget
  let overBudget = false;
  let finalSets = sets;
  const initialTotalBytes = sets.reduce((sum, s) => sum + s.totalSize, 0);

  if (device.storageBudgetBytes && device.storageBudgetBytes > 0) {
    if (initialTotalBytes > device.storageBudgetBytes) {
      overBudget = true;
      warnings.push(
        `Storage budget of ${device.storageBudgetBytes} bytes exceeded (${initialTotalBytes} bytes required)`
      );

      // Truncate deterministically: firmware first, then ROM sets by rule position/name
      const firmwareSets = sets.filter((s) => s.kind === "firmware");
      const romSets = sets.filter((s) => s.kind === "rom");

      const budgetedSets: ManifestSet[] = [];
      let runningBytes = 0;

      for (const s of firmwareSets) {
        if (runningBytes + s.totalSize <= device.storageBudgetBytes) {
          budgetedSets.push(s);
          runningBytes += s.totalSize;
        }
      }

      for (const s of romSets) {
        if (runningBytes + s.totalSize <= device.storageBudgetBytes) {
          budgetedSets.push(s);
          runningBytes += s.totalSize;
        }
      }

      finalSets = budgetedSets;
    }
  }

  const finalTotalBytes = finalSets.reduce((sum, s) => sum + s.totalSize, 0);
  const version = calculateManifestVersion(finalSets);

  return {
    deviceId: device.id,
    version,
    generatedAt: new Date().toISOString(),
    overBudget,
    totalBytes: finalTotalBytes,
    sets: finalSets,
    warnings,
  };
}

function getRegionScore(region: string | null | undefined, prefList: string[]): number {
  if (!region) return 999;
  const regUpper = region.toUpperCase();
  for (let i = 0; i < prefList.length; i++) {
    if (regUpper.includes(prefList[i])) {
      return i;
    }
  }
  return 999;
}
