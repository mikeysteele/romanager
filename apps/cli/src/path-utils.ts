import { resolve } from "node:path";
import type { CliConfig } from "./config.ts";

/**
 * Strips the manifest-level `bios/` prefix for firmware paths, because
 * `config.paths.bios` already points to the target BIOS root directory.
 */
export function getLocalRelativePath(kind: "rom" | "firmware", manifestPath: string): string {
  if (kind === "firmware") {
    return manifestPath.replace(/^bios\//, "");
  }
  return manifestPath;
}

/**
 * Resolves a manifest file path to its absolute local path on disk,
 * rooting firmware in `config.paths.bios` and ROMs in `config.paths.roms`.
 */
export function resolveSetFilePath(
  config: CliConfig,
  kind: "rom" | "firmware",
  manifestPath: string
): string {
  const rootDir = kind === "firmware" ? config.paths.bios : config.paths.roms;
  return resolve(rootDir, getLocalRelativePath(kind, manifestPath));
}
