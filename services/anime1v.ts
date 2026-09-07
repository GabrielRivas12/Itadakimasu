const API_KEY = process.env.EXPO_PUBLIC_API_KEY;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export interface CatalogAnime {
  id: number | string;
  title: string;
  slug: string;
  url: string;
  image: string | null;
  backdrop: string | null;
  backcover?: string | null;
  type: string;
  score: number | null;
  status: string | null;
  year: string | null;
  malId: number | null;
  provider: string;
}

export interface CatalogResult {
  page: number;
  genre: string | null;
  results: CatalogAnime[];
  count: number;
  hasMore: boolean;
}

export async function fetchCatalog(
  page = 1,
  options: {
    genre?: string;
    type?: string;
    sort?: string;
    status?: string;
    year?: string;
    q?: string;
    provider?: string;
  } = {}
): Promise<CatalogResult | null> {
  const params: Record<string, string> = { page: String(page), provider: options.provider ?? 'animeav1' };

  if (options.genre) params.genre = options.genre;
  if (options.type) params.type = options.type;
  if (options.sort) params.sort = options.sort;
  if (options.status) params.status = options.status;
  if (options.year) params.year = options.year;
  if (options.q) params.q = options.q;

  return await fetchFromApi<CatalogResult>('/api/v1/anime/catalog', params);
}

export interface TrendingAnime {
  id?: number | string;
  title: string;
  slug: string;
  provider: string;
  url: string;
  image: string | null;
  backdrop: string | null;
  score: number | null;
  votes?: number | null;
  type: string;
  year: string | null;
  status: string | null;
  genres?: string[];
  description?: string | null;
  malId?: number | null;
  lastEpisode?: {
    number: number;
    date: string;
  } | null;
}

export interface TrendingResult {
  days: number;
  results: TrendingAnime[];
  count: number;
  updatedAt: string;
}

export async function fetchTrending(
  count = 12,
  days = 7
): Promise<TrendingAnime[]> {
  const params: Record<string, string> = {
    count: String(count),
    days: String(days),
  };

  const data = await fetchFromApi<TrendingResult>(
    '/api/v1/anime/trending',
    params
  );

  return data?.results || [];
}

export function buildImageProxyUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  if (imageUrl.includes('/api/v1/anime/image-proxy')) return imageUrl;
  return `${BASE_URL}/api/v1/anime/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}

export interface Anime1VSearchResult {
  id: string;
  title: string;
  slug: string;
  url: string;
  image: string | null;
  backdrop: string | null;
  type: string | number;
  hasEpisodes?: boolean;
  titleScore?: number;
  seasonMatch?: boolean;
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

export interface Anime1VGenre {
  id: number | null;
  name: string;
  slug: string;
  malId: number | null;
}

export interface Anime1VSeason {
  name: string;
  slug?: string;
  year?: number;
  label?: string;
}

export interface Anime1VRelation {
  type: number;
  typeLabel: string;
  id: number;
  title: string;
  slug: string;
  url: string;
  image: string | null;
  startDate: string | null;
  year: string | null;
}

export interface Anime1VDetail {
  id: number;
  title: string;
  titleJapanese: string | null;
  description: string | null;
  image: string | null;
  backdrop: string | null;
  backcover?: string | null;
  status: string | null;
  type: string | null;
  year: string | null;
  season?: Anime1VSeason | string | null;
  startDate: string | null;
  endDate: string | null;
  score: number | null;
  votes: number | null;
  totalEpisodes: number;
  malId: number | null;
  trailer: string | null;
  genres: Anime1VGenre[] | null;
  relations?: Anime1VRelation[];
  episodes: Anime1VEpisode[];
  url: string;
  slug: string;
}

export async function getAnime1VDetail(
  url: string,
  limit?: number
): Promise<Anime1VDetail | null> {
  const params: Record<string, string> = { url };

  if (limit) {
    params.limit = limit.toString();
  }

  return await fetchFromApi<Anime1VDetail>('/api/v1/anime/info', params);
}

export type Anime1VVariant = 'SUB' | 'DUB';

export interface Anime1VEpisodeLinks {
  episode: number;
  title: string;
  variants?: {
    SUB: number;
    DUB: number;
  };
  streamLinks: {
    SUB: Anime1VStreamLink[];
    DUB?: Anime1VStreamLink[];
  };
  downloadLinks?: {
    SUB: Anime1VDownloadLink[];
    DUB?: Anime1VDownloadLink[];
  };
}

export interface Anime1VDownloadLink {
  server: string;
  url: string;
  quality?: string;
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
    { url, includeMega: "true" }
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

export async function getAnime1VInfoWithAllEpisodes(
  url: string
): Promise<Anime1VInfo | null> {
  // Intentar obtener todos los episodios de una vez con un límite alto
  const info = await getAnime1VInfo(url, 999);

  if (info && info.totalEpisodes > 0 && info.episodes.length < info.totalEpisodes) {
    console.log(`Solo se obtuvieron ${info.episodes.length} de ${info.totalEpisodes} episodios totales`);
    console.log("La API puede tener paginación. Usa getAllAnime1VEpisodes()");
  }

  return info;
}

export interface Anime1VResolvedStream {
  success: boolean;
  server: string;
  mediaType: string;
  streamUrl: string;
  resolvedFrom: string;
}

async function fetchResolvedStream(
  params: Record<string, string>
): Promise<Anime1VResolvedStream | null> {
  try {
    const queryParams = new URLSearchParams({
      ...params,
      apiKey: API_KEY ?? "",
    }).toString();

    const response = await fetch(`${BASE_URL}/api/v1/anime/resolve?${queryParams}`);

    if (!response.ok) {
      console.log(`HTTP ERROR ${response.status} en /resolve con params: ${JSON.stringify(params)}`);
      return null;
    }

    const text = await response.text();

    try {
      const json = JSON.parse(text);

      // /resolve responde plano: { success, server, mediaType, streamUrl, resolvedFrom }
      if (json?.success && typeof json.streamUrl === 'string') {
        return json as Anime1VResolvedStream;
      }

      // Compatibilidad: respuesta envuelta en { success, data: { ... } }
      if (json?.success && json?.data?.streamUrl) {
        return json.data as Anime1VResolvedStream;
      }

      console.log("API respondió success=false en /resolve:", json);
      return null;
    } catch (err) {
      console.log("Respuesta no es JSON (probable HTML):", text.slice(0, 200));
      return null;
    }
  } catch (error) {
    console.error("Error fetching Anime1V resolve:", error);
    return null;
  }
}

export async function resolveAnime1VStream(
  url: string
): Promise<Anime1VResolvedStream | null> {
  return await fetchResolvedStream({ url });
}

export async function resolveAnime1VStreams(
  urls: string[]
): Promise<Anime1VResolvedStream | null> {
  return await fetchResolvedStream({ urls: JSON.stringify(urls) });
}

export function buildVideoProxyUrl(streamUrl: string): string {
  return `${BASE_URL}/api/v1/anime/video-proxy?url=${encodeURIComponent(streamUrl)}`;
}

const NON_MEDIA_EXT_RE = /\.(css|js|json|xml|html?|txt|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|map|php|asp|aspx|jsp)(\?|#|$)/i;
const MEDIA_EXT_RE = /\.(m3u8|mp4|mkv|webm|ts|m4v|mov|ogv|ogg|avi)(\?|#|$)/i;

export function isDirectMediaUrl(url: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return MEDIA_EXT_RE.test(lower) || lower.includes('/api/v1/anime/video-proxy');
}

export function isValidMediaUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith('data:') || lower.startsWith('blob:')) return false;
  if (NON_MEDIA_EXT_RE.test(lower)) return false;
  if (MEDIA_EXT_RE.test(lower)) return true;
  if (/\/m3u8\//.test(lower)) return true;
  return false;
}

export interface LatestEpisode {
  title: string;
  slug: string;
  url: string;
  image: string;
  episode: number;
  dateLabel: string;
  timestamp: string;
  provider: string;
  malId: number | null;
}

export async function fetchLatestEpisodes(isAdult: boolean = false): Promise<LatestEpisode[]> {
  try {
    const params: Record<string, string> = {};
    if (isAdult) {
      params.provider = 'hentaila';
    }

    const queryParams = new URLSearchParams({
      ...params,
      apiKey: API_KEY ?? "",
    }).toString();

    const response = await Promise.race([
      fetch(`${BASE_URL}/api/v1/anime/latest-episodes?${queryParams}`),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('fetch timeout')), 10000)
      ),
    ]) as Response;

    if (!response.ok) return [];
    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return [];
    }
    if (json?.success && json?.data?.results) {
      return json.data.results;
    }
    return [];
  } catch (error) {
    console.error('Error fetching latest episodes:', error);
    return [];
  }
}

export interface ScheduleEpisode {
  id?: number;
  title: string;
  slug: string;
  url: string;
  image: string;
  category?: string;
  episode: number;
  time?: string;
  label?: string;
  publishedAt?: string;
  timestamp?: string;
  airDate?: string;
  dayOfWeek?: string;
  predicted?: boolean;
  provider: string;
}

export interface ScheduleGroup {
  day?: number;
  dayName?: string;
  count?: number;
  date: string;
  dateLabel: string;
  episodes: ScheduleEpisode[];
}

interface ScheduleApiResult {
  provider?: string;
  generatedAt?: string;
  count?: number;
  groups: Array<Omit<ScheduleGroup, 'date' | 'dateLabel'>>;
}

export async function fetchSchedule(
  provider?: string,
  upcoming: boolean = false
): Promise<ScheduleGroup[]> {
  try {
    const params: Record<string, string> = {};
    if (provider) {
      params.provider = provider;
    }
    if (upcoming) {
      params.upcoming = 'true';
    }

    const data = await fetchFromApi<ScheduleApiResult>('/api/v1/anime/schedule', params);
    const rawGroups = Array.isArray(data?.groups) ? data.groups : [];
    const groups: ScheduleGroup[] = rawGroups.map((g) => ({
      ...g,
      date: g.day ? String(g.day) : '',
      dateLabel: g.dayName || (g.day ? String(g.day) : ''),
    }));
    return groups || [];
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return [];
  }
}
