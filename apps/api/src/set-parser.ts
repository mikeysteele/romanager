import { dirname, join, relative, basename } from "@std/path";

export interface ParsedDescriptorFile {
  relPath: string; // path referenced inside descriptor
  resolvedPath: string | null; // actual disk path if found, null if missing
  role: "track" | "disc" | "descriptor" | "aux";
}

export interface ParsedDescriptorResult {
  descriptorPath: string;
  type: "cue" | "gdi" | "m3u";
  files: ParsedDescriptorFile[];
  isComplete: boolean;
}

/**
 * Case-insensitive file path resolver starting from baseDir.
 */
export async function findCaseInsensitive(baseDir: string, relPath: string): Promise<string | null> {
  const normalized = relPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  let currentDir = baseDir;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    let foundName: string | null = null;

    try {
      for await (const entry of Deno.readDir(currentDir)) {
        if (entry.name.toLowerCase() === part) {
          foundName = entry.name;
          break;
        }
      }
    } catch {
      return null;
    }

    if (!foundName) return null;
    currentDir = join(currentDir, foundName);
  }

  return currentDir;
}

/**
 * Parse a .cue file to extract referenced binary/audio files.
 */
export async function parseCueFile(cueFilePath: string): Promise<ParsedDescriptorResult> {
  const dir = dirname(cueFilePath);
  const content = await Deno.readTextFile(cueFilePath);
  const lines = content.split(/\r?\n/);
  const fileRegex = /^\s*FILE\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i;

  const files: ParsedDescriptorFile[] = [];
  let isComplete = true;

  for (const line of lines) {
    const match = line.match(fileRegex);
    if (match) {
      const referenced = match[1] || match[2] || match[3];
      if (referenced) {
        const resolved = await findCaseInsensitive(dir, referenced);
        if (!resolved) {
          isComplete = false;
        }
        files.push({
          relPath: referenced,
          resolvedPath: resolved,
          role: "track",
        });
      }
    }
  }

  return {
    descriptorPath: cueFilePath,
    type: "cue",
    files,
    isComplete: files.length > 0 && isComplete,
  };
}

/**
 * Parse a .gdi file to extract referenced track files.
 */
export async function parseGdiFile(gdiFilePath: string): Promise<ParsedDescriptorResult> {
  const dir = dirname(gdiFilePath);
  const content = await Deno.readTextFile(gdiFilePath);
  const lines = content.split(/\r?\n/);
  const gdiRegex = /^\s*\d+\s+\d+\s+\d+\s+\d+\s+(?:"([^"]+)"|'([^']+)'|(\S+))/;

  const files: ParsedDescriptorFile[] = [];
  let isComplete = true;

  for (const line of lines) {
    const match = line.match(gdiRegex);
    if (match) {
      const referenced = match[1] || match[2] || match[3];
      if (referenced) {
        const resolved = await findCaseInsensitive(dir, referenced);
        if (!resolved) {
          isComplete = false;
        }
        files.push({
          relPath: referenced,
          resolvedPath: resolved,
          role: "track",
        });
      }
    }
  }

  return {
    descriptorPath: gdiFilePath,
    type: "gdi",
    files,
    isComplete: files.length > 0 && isComplete,
  };
}

/**
 * Parse a .m3u file to extract referenced discs/cue/chd files.
 * If an entry points to a .cue or .gdi, it recursively resolves its tracks.
 */
export async function parseM3uFile(m3uFilePath: string): Promise<ParsedDescriptorResult> {
  const dir = dirname(m3uFilePath);
  const content = await Deno.readTextFile(m3uFilePath);
  const lines = content.split(/\r?\n/);

  const files: ParsedDescriptorFile[] = [];
  let isComplete = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const resolved = await findCaseInsensitive(dir, trimmed);
    if (!resolved) {
      isComplete = false;
      files.push({
        relPath: trimmed,
        resolvedPath: null,
        role: "disc",
      });
      continue;
    }

    files.push({
      relPath: trimmed,
      resolvedPath: resolved,
      role: "disc",
    });

    // If disc is a cue sheet or gdi, also resolve its children
    const ext = resolved.split(".").pop()?.toLowerCase();
    if (ext === "cue") {
      const nestedCue = await parseCueFile(resolved);
      if (!nestedCue.isComplete) isComplete = false;
      for (const nested of nestedCue.files) {
        files.push({
          relPath: nested.resolvedPath ? relative(dir, nested.resolvedPath).replace(/\\/g, "/") : nested.relPath,
          resolvedPath: nested.resolvedPath,
          role: "track",
        });
      }
    } else if (ext === "gdi") {
      const nestedGdi = await parseGdiFile(resolved);
      if (!nestedGdi.isComplete) isComplete = false;
      for (const nested of nestedGdi.files) {
        files.push({
          relPath: nested.resolvedPath ? relative(dir, nested.resolvedPath).replace(/\\/g, "/") : nested.relPath,
          resolvedPath: nested.resolvedPath,
          role: "track",
        });
      }
    }
  }

  return {
    descriptorPath: m3uFilePath,
    type: "m3u",
    files,
    isComplete: files.length > 0 && isComplete,
  };
}
