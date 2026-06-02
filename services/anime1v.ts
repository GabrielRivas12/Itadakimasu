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

    //  1. Validar status HTTP
    if (!response.ok) {
      console.log(`HTTP ERROR ${response.status} en ${endpoint} con params: ${JSON.stringify(params)}`);
      return null;
    }

    const text = await response.text();

    //  2. Evitar crash por HTML u otros formatos
    try {
      const json = JSON.parse(text);

      if (json?.success) {
        return json.data;
      }

      console.log("API respondió success=false:", json);
      return null;
    } catch (err) {
      console.log("Respuesta no es JSON (probable HTML):", text.slice(0, 200));
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

export async function getAnime1VInfo(
  url: string, 
  limit?: number  // Añadir parámetro opcional
): Promise<Anime1VInfo | null> {
  const params: Record<string, string> = { url };
  
  // Si se especifica un límite, añadirlo a los parámetros
  if (limit) {
    params.limit = limit.toString();
  }
  
  return await fetchFromApi<Anime1VInfo>("/api/v1/anime/info", params);
}

export async function getAnime1VEpisodeLinks(
  url: string
): Promise<Anime1VEpisodeLinks | null> {
  return await fetchFromApi<Anime1VEpisodeLinks>(
    "/api/v1/anime/episode",
    { url }
  );
}

export async function getAllAnime1VEpisodes(
  url: string
): Promise<Anime1VEpisode[]> {
  const allEpisodes: Anime1VEpisode[] = [];
  let currentPage = 1;
  let hasMore = true;
  const limit = 50; // Intentar obtener 50 por página
  
  while (hasMore) {
    try {
      const params: Record<string, string> = { 
        url,
        page: currentPage.toString(),
        limit: limit.toString()
      };
      
      const data = await fetchFromApi<Anime1VInfo>("/api/v1/anime/info", params);
      
      if (data?.episodes && data.episodes.length > 0) {
        allEpisodes.push(...data.episodes);
        
        // Si recibimos menos episodios que el límite, es la última página
        if (data.episodes.length < limit) {
          hasMore = false;
        } else {
          currentPage++;
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error("Error fetching episodes page:", error);
      hasMore = false;
    }
  }
  
  return allEpisodes;
}

// Alternativa: Intentar con un límite grande
export async function getAnime1VInfoWithAllEpisodes(
  url: string
): Promise<Anime1VInfo | null> {
  // Intentar obtener todos los episodios de una vez con un límite alto
  const info = await getAnime1VInfo(url, 999);
  
  if (info && info.totalEpisodes > 0 && info.episodes.length < info.totalEpisodes) {
    console.log(`⚠️ Solo se obtuvieron ${info.episodes.length} de ${info.totalEpisodes} episodios totales`);
    console.log("💡 La API puede tener paginación. Usa getAllAnime1VEpisodes()");
  }
  
  return info;
}