import z from "zod";

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function getPlatformFromFilename(filename: string): string {
  const ext = filename.split(".").pop();
  switch (ext) {
    case "nes": return "nes";
    case "sfc":
    case "smc": return "snes";
    case "gb": return "gameboy";
    case "gba": return "gba";
    case "md":
    case "bin": return "genesis";
    default: return "unknown";
  }
}

export async function fetchAndValidate<TSchema extends z.Schema>(schema: TSchema, input: string | URL | globalThis.Request,
        init?: RequestInit): Promise<z.infer<TSchema>> {
    const res = await fetch(input, init);
    if (res.ok) {
        return schema.parse(await res.json());
    }
    throw new Error(`Failed to fetch schema from ${input}`);
}