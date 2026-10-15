import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { db } from "./db/index.ts";
import { settings } from "./db/schema.ts";
import { eq } from "drizzle-orm";
import { PathPolicyViolation, sanitizeRelativePath } from "@repo/shared";

export { PathPolicyViolation, sanitizeRelativePath };

export function safeRealpath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

/**
 * Checks whether targetPath is strictly inside one of the allowed roots.
 */
export function isWithinRoots(allowedRoots: string | string[], targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== "string") return false;
  if (targetPath.includes("\0")) return false;

  const roots = Array.isArray(allowedRoots) ? allowedRoots : [allowedRoots];
  if (roots.length === 0) return false;

  const resolvedTarget = safeRealpath(targetPath);

  for (const root of roots) {
    if (!root || typeof root !== "string") continue;
    const resolvedRoot = safeRealpath(root);
    const rel = path.relative(resolvedRoot, resolvedTarget);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
      return true;
    }
  }

  return false;
}

/**
 * Asserts that targetPath is strictly inside one of the allowed roots.
 * Throws PathPolicyViolation if outside.
 */
export function assertWithinRoots(
  allowedRoots: string | string[],
  targetPath: string,
  label = "Path"
): string {
  if (!isWithinRoots(allowedRoots, targetPath)) {
    throw new PathPolicyViolation(`${label} outside allowed boundaries: ${targetPath}`);
  }
  return safeRealpath(targetPath);
}

export async function getAllowedStorageRoots(): Promise<string[]> {
  const roots: string[] = [];

  // 1. ROMS_DIR
  const romsDir = process.env.ROMS_DIR || path.resolve(process.cwd(), "roms");
  roots.push(path.resolve(romsDir));

  // 2. BIOS_DIR (if set)
  if (process.env.BIOS_DIR) {
    roots.push(path.resolve(process.env.BIOS_DIR));
  }

  // 3. Custom settings in DB (roms_dir, saves_dir)
  try {
    const customRoms = await db.select().from(settings).where(eq(settings.key, "roms_dir")).get();
    if (customRoms?.value) {
      roots.push(path.resolve(customRoms.value));
    }
    const customSaves = await db.select().from(settings).where(eq(settings.key, "saves_dir")).get();
    if (customSaves?.value) {
      roots.push(path.resolve(customSaves.value));
    }
  } catch {
    // DB not ready or during schema tests
  }

  // 4. Default saves dir
  roots.push(path.resolve(process.cwd(), "storage/saves"));

  // 5. In test environment, also permit os.tmpdir() and process.cwd()
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    roots.push(path.resolve(os.tmpdir()));
    roots.push(path.resolve(process.cwd()));
  }

  return Array.from(new Set(roots));
}

export async function getAllowedBrowseRoots(): Promise<Array<{ label: string; path: string }>> {
  const allowedRoots: Array<{ label: string; path: string }> = [];

  // 1. ROMs directory
  const romsDir = process.env.ROMS_DIR || path.resolve(process.cwd(), "roms");
  allowedRoots.push({ label: "ROMs", path: path.resolve(romsDir) });

  // 2. Project directory
  allowedRoots.push({ label: "Project", path: path.resolve(process.cwd()) });

  // 3. User home directory (if readable)
  const home = os.homedir();
  if (home && fs.existsSync(home)) {
    allowedRoots.push({ label: "Home (~)", path: path.resolve(home) });
  }

  // 4. Standard mount points (if present)
  for (const mnt of ["/mnt", "/media"]) {
    if (fs.existsSync(mnt)) {
      allowedRoots.push({ label: mnt, path: path.resolve(mnt) });
    }
  }

  // 5. DB configured settings
  try {
    const customRoms = await db.select().from(settings).where(eq(settings.key, "roms_dir")).get();
    if (customRoms?.value && fs.existsSync(customRoms.value)) {
      allowedRoots.push({ label: "Configured ROMs", path: path.resolve(customRoms.value) });
    }
    const customSaves = await db.select().from(settings).where(eq(settings.key, "saves_dir")).get();
    if (customSaves?.value && fs.existsSync(customSaves.value)) {
      allowedRoots.push({ label: "Configured Saves", path: path.resolve(customSaves.value) });
    }
  } catch {
    // DB not ready
  }

  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    allowedRoots.push({ label: "Temp", path: path.resolve(os.tmpdir()) });
  }

  return allowedRoots;
}
