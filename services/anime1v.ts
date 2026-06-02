const API_KEY = process.env.EXPO_PUBLIC_API_KEY;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export interface Anime1VSearchResult {
  id: string;
  title: string;
  slug: string;
  url: string;
  image: string | null;
  backdrop: string | null;
  type: string;
}

export interface Anime1VEpisode {
  id: number | string;
  number: number;
  title: string;
  url: string;
}

export interface Anime1VInfo {
  title: string;
  description: string;
  score: number;
  totalEpisodes: number;
  genres: string[];
  episodes: Anime1VEpisode[];
}

export interface Anime1VStreamLink {
  server: string;
  url: string;
}

export interface Anime1VEpisodeLinks {
  episode: number;
  title: string;
  streamLinks: {
    SUB: Anime1VStreamLink[];
    DUB?: Anime1VStreamLink[];
  };
}

async function fetchFromApi<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T | null> {
  try {
    const queryParams = new URLSearchParams({
      ...params,
      apiKey: API_KEY ?? "",
    }).toString();

    const response = await fetch(`${BASE_URL}${endpoint}?${queryParams}`);

    // ✅ 1. Validar status HTTP
    if (!response.ok) {
      console.log(`HTTP ERROR ${response.status} en ${endpoint}`);
      return null;
    }

    const text = await response.text();

    // ⚠️ 2. Evitar crash por HTML u otros formatos
    try {
      const json = JSON.parse(text);

      if (json?.success) {
        return json.data;
      }

      console.log("API respondió success=false:", json);
      return null;
    } catch (err) {
      console.log("❌ Respuesta no es JSON (probable HTML):", text.slice(0, 200));
      return null;
    }
  } catch (error) {
    console.error(`Error fetching from Anime1V API (${endpoint}):`, error);
    return null;
  }
}

export async function searchAnime1V(
  query: string,
  domain?: string
): Promise<Anime1VSearchResult[]> {
  const params: Record<string, string> = { q: query };

  if (domain) {
    params.domain = domain;
  }

  const data = await fetchFromApi<{ results: Anime1VSearchResult[] }>(
    "/api/v1/anime/search",
    params
  );

  return data?.results || [];
}

export async function getAnime1VInfo(url: string): Promise<Anime1VInfo | null> {
  return await fetchFromApi<Anime1VInfo>("/api/v1/anime/info", { url });
}

export async function getAnime1VEpisodeLinks(
  url: string
): Promise<Anime1VEpisodeLinks | null> {
  return await fetchFromApi<Anime1VEpisodeLinks>(
    "/api/v1/anime/episode",
    { url }
  );
}