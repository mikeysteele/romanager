export const DEFAULT_RAWG_TO_ES_FOLDERS: Record<string, string> = {
  // Nintendo
  "nes": "nes",
  "nintendo-entertainment-system": "nes",
  "snes": "snes",
  "super-nintendo": "snes",
  "super-nintendo-entertainment-system": "snes",
  "nintendo-64": "n64",
  "n64": "n64",
  "gamecube": "gamecube",
  "nintendo-gamecube": "gamecube",
  "wii": "wii",
  "wii-u": "wiiu",
  "game-boy": "gb",
  "game-boy-color": "gbc",
  "game-boy-advance": "gba",
  "nintendo-ds": "nds",
  "nintendo-3ds": "3ds",

  // Sony
  "playstation": "psx",
  "playstation1": "psx",
  "psx": "psx",
  "ps1": "psx",
  "playstation-2": "ps2",
  "playstation2": "ps2",
  "ps2": "ps2",
  "playstation-3": "ps3",
  "playstation3": "ps3",
  "ps3": "ps3",
  "psp": "psp",
  "playstation-portable": "psp",
  "ps-vita": "psvita",
  "psvita": "psvita",

  // Sega
  "genesis": "megadrive",
  "sega-genesis": "megadrive",
  "sega-mega-drive": "megadrive",
  "mega-drive": "megadrive",
  "megadrive": "megadrive",
  "sega-master-system": "mastersystem",
  "master-system": "mastersystem",
  "sega-cd": "segacd",
  "mega-cd": "segacd",
  "sega-saturn": "saturn",
  "saturn": "saturn",
  "dreamcast": "dreamcast",
  "sega-dreamcast": "dreamcast",
  "game-gear": "gamegear",
  "sega-game-gear": "gamegear",

  // Others
  "atari-2600": "atari2600",
  "atari-5200": "atari5200",
  "atari-7800": "atari7800",
  "atari-lynx": "lynx",
  "lynx": "lynx",
  "neo-geo": "neogeo",
  "neogeo": "neogeo",
  "arcade": "arcade",
  "pc-engine": "pcengine",
  "turbografx-16": "pcengine",
  "scummvm": "scummvm",
  "dos": "dos",
};

export function getDefaultEsFolder(slugOrName: string): string | null {
  const norm = slugOrName.toLowerCase().trim().replace(/[_\s]+/g, "-");
  if (DEFAULT_RAWG_TO_ES_FOLDERS[norm]) {
    return DEFAULT_RAWG_TO_ES_FOLDERS[norm];
  }
  for (const [key, folder] of Object.entries(DEFAULT_RAWG_TO_ES_FOLDERS)) {
    if (norm === key || norm.includes(key)) {
      return folder;
    }
  }
  return null;
}
