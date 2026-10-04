import type { Game } from "@repo/shared";

interface RawgPlatformRecord {
  platform: RawgPlatform;
}

interface RawgGame {
  id: number;
  slug: string;
  name: string;
  released: string;
  tba: boolean;
  background_image?: string;
  rating: number;
  rating_top: number;
  ratings_count: number;
  added: number;
  metacritic?: number;
  playtime: number;
  updated: string;
  platforms?: RawgPlatformRecord[];
}

interface RawgGamesResponse {
  count: number;
  next?: string;
  previous?: string;
  results?: RawgGame[];
}


interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PLATFORM_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 8000;

const searchCache = new Map<string, CacheEntry<Game[]>>();
let platformCache: CacheEntry<RawgPlatform[]> | null = null;

export async function searchMetadata(query: string): Promise<Game[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  // Check cache
  const cached = searchCache.get(normalizedQuery);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const apiKey = Deno.env.get("RAWG_API_KEY");
  if (!apiKey) {
    console.warn("RAWG_API_KEY environment variable is not set. Metadata search will return empty results.");
    return [];
  }

  const searchUrl = new URL("https://api.rawg.io/api/games");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("search", normalizedQuery);
  searchUrl.searchParams.set("page_size", "20");

  try {
    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!response.ok) {
        console.error(`RAWG API returned status: ${response.status}`);
        return [];
    }
    
    const data = await response.json() as RawgGamesResponse;
    const results: Game[] = data.results?.map((game: RawgGame) => ({
      id: String(game.id),
      name: game.name,
      slug: game.slug,
      released: game.released ? game.released.substring(0, 4) : undefined,
      backgroundImage: game.background_image || undefined,
      rating: game.rating || undefined,
      platforms: game.platforms?.map(p => ({
        id: String(p.platform.id),
        name: p.platform.name,
        slug: p.platform.slug
      }))
    })) ?? [];

    // Store in cache (cap at 200 entries to prevent memory leak)
    if (searchCache.size > 200) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }
    searchCache.set(normalizedQuery, {
      data: results,
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS
    });

    return results;
  } catch (e) {
    console.error("Error searching metadata from RAWG:", e);
  }
  
  return [];
}

export async function fetchMetadata(filename: string): Promise<Game | null> {
    const query = filename.replace(/\.[^/.]+$/, "");
    const results = await searchMetadata(query);
    return results.length > 0 ? results[0] : null;
}

export interface RawgPlatform {
  id: number;
  name: string;
  slug: string;
  games_count: number;
  image_background: string;
  image: string | null;
  year_start: number | null;
  year_end: number | null;
}

export interface RawgPlatformsResponse {
  count: number;
  next?: string;
  previous?: string;
  results?: RawgPlatform[];
}

export async function fetchPlatforms(): Promise<RawgPlatform[]> {
  // Check cached platforms
  if (platformCache && Date.now() < platformCache.expiresAt) {
    return platformCache.data;
  }

  const apiKey = Deno.env.get("RAWG_API_KEY");
  if (!apiKey) {
    console.warn("RAWG_API_KEY environment variable is not set. Platform search will return empty results.");
    return [];
  }

  const url = new URL("https://api.rawg.io/api/platforms");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("page_size", "50"); 

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!response.ok) {
        console.error(`RAWG API returned status: ${response.status}`);
        return [];
    }
    
    const data = await response.json() as RawgPlatformsResponse;
    const results = data.results ?? [];

    platformCache = {
      data: results,
      expiresAt: Date.now() + PLATFORM_CACHE_TTL_MS
    };

    return results;
  } catch (e) {
    console.error("Error fetching platforms from RAWG:", e);
  }
  
  return [];
}
