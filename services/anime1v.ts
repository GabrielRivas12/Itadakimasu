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
  /** Proveedor de origen (ej. "AnimeAV1", "HentaiLA .io"). */
  provider?: string;
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

// Algunos proveedores (p. ej. MonosChinos) devuelven `genres` como un array de
// strings, mientras que otros (AnimeAV1, TioAnime) devuelven objetos. Lo
// normalizamos a `Anime1VGenre` para que la UI siempre pueda leer `genre.name`.
const normalizeGenre = (genre: unknown): Anime1VGenre | null => {
  if (!genre) return null;

  if (typeof genre === 'string') {
    const name = genre.trim();
    return name ? { id: null, name, slug: '', malId: null } : null;
  }

  if (typeof genre === 'object') {
    const g = genre as Record<string, unknown>;
    const name =
      typeof g.name === 'string' ? g.name : typeof g.title === 'string' ? g.title : null;
    if (!name) return null;
    return {
      id: typeof g.id === 'number' ? g.id : null,
      name,
      slug: typeof g.slug === 'string' ? g.slug : '',
      malId: typeof g.malId === 'number' ? g.malId : null,
    };
  }

  return null;
};

const normalizeGenres = (genres: unknown): Anime1VGenre[] | null => {
  if (!Array.isArray(genres)) return null;
  const normalized = genres
    .map(normalizeGenre)
    .filter((genre): genre is Anime1VGenre => genre !== null);
  return normalized.length ? normalized : null;
};

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

export interface Anime1VInfoBySlug {
  title: string;
  image: string | null;
  year: string | null;
  score: number | null;
  totalEpisodes: number;
  genres: Anime1VGenre[];
}

export async function getAnime1VInfoBySlug(
  slug: string,
  provider?: string
): Promise<Anime1VInfoBySlug | null> {
  const params: Record<string, string> = { slug };

  if (provider) {
    params.provider = provider;
  }

  const data = await fetchFromApi<Anime1VInfoBySlug>('/api/v1/anime/info-by-slug', params);
  if (!data) return null;

  return { ...data, genres: normalizeGenres(data.genres) ?? [] };
}

export async function getAnime1VDetail(
  url: string,
  limit?: number
): Promise<Anime1VDetail | null> {
  const params: Record<string, string> = { url };

  if (limit) {
    params.limit = limit.toString();
  }

  const data = await fetchFromApi<Anime1VDetail>('/api/v1/anime/info', params);
  if (!data) return null;

  return { ...data, genres: normalizeGenres(data.genres) };
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

const FETCH_TIMEOUT_MS = 15000;
// /resolve proxya sitios externos (streaming), por lo que suele tardar más que
// una llamada normal; le damos más margen antes de abortar.
const RESOLVE_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url: string, ms: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    // Distinguimos el timeout propio de un abort externo: así el llamador puede
    // tratarlo como un fallo esperado (fallback) en vez de un error inesperado.
    if (timedOut) {
      const timeoutError = new Error(`Request timed out after ${ms}ms`);
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

    const response = await fetchWithTimeout(`${BASE_URL}${endpoint}?${queryParams}`);

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
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      console.warn(`[Anime1V] ${endpoint} sin respuesta (timeout/abort); usando fallback.`);
    } else {
      console.error(`Error fetching from Anime1V API (${endpoint}):`, error);
    }
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

export interface Anime1VSubtitle {
  language: string;
  label: string;
  default?: boolean;
  url: string;
  format?: string;
  sourceUrl?: string;
}

export interface Anime1VResolvedStream {
  success: boolean;
  server: string;
  mediaType: string;
  streamUrl: string;
  resolvedFrom: string;
  subtitles?: Anime1VSubtitle[];
}

async function fetchResolvedStream(
  params: Record<string, string>
): Promise<Anime1VResolvedStream | null> {
  try {
    const queryParams = new URLSearchParams({
      ...params,
      apiKey: API_KEY ?? "",
    }).toString();

    const response = await fetchWithTimeout(
      `${BASE_URL}/api/v1/anime/resolve?${queryParams}`,
      RESOLVE_TIMEOUT_MS
    );

    if (!response.ok) {
      console.log(`HTTP ERROR ${response.status} en /resolve con params: ${JSON.stringify(params)}`);
      return null;
    }

    const text = await response.text();

    try {
      const json = JSON.parse(text);

      // /resolve responde plano: { success, server, mediaType, streamUrl, resolvedFrom, subtitles }
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
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      console.warn(
        `[Anime1V] /resolve sin respuesta (timeout/abort); se usará el WebView. params: ${JSON.stringify(params).slice(0, 120)}`
      );
    } else {
      console.error("Error fetching Anime1V resolve:", error);
    }
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

export function buildSubtitlesProxyUrl(subtitleUrl: string): string {
  if (!subtitleUrl) return '';
  if (subtitleUrl.includes('/api/v1/anime/subtitles-proxy.vtt')) return subtitleUrl;
  // Normalizar antes de codificar: si la URL ya trae %20 el encodeURIComponent
  // los doble-codifica (%2520) y el backend busca un archivo inexistente.
  let clean = subtitleUrl;
  try {
    clean = decodeURI(subtitleUrl);
  } catch (_) {}
  return `${BASE_URL}/api/v1/anime/subtitles-proxy.vtt?url=${encodeURIComponent(clean)}`;
}

export function srtToVtt(input: string): string {
  if (!input) return 'WEBVTT\n\n';
  if (input.trim().startsWith('WEBVTT')) return input;
  const text = String(input).replace(/^\uFEFF/, '').replace(/\r/g, '');
  const blocks = text.trim().split(/\n\s*\n/);
  const vttBlocks: string[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines.length) continue;

    const timeIdx = lines.findIndex((l) =>
      /\d{1,2}:\d{2}:\d{2},\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2},\d{1,3}/.test(l)
    );
    if (timeIdx === -1) continue;

    const timeLine = lines[timeIdx];
    const textLines = lines.slice(timeIdx + 1).filter((l) => l.trim().length > 0);

    const convertedTime = timeLine.replace(
      /(\d{1,2}):(\d{2}):(\d{2}),(\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2}),(\d{1,3})/,
      (_m, h1, m1, s1, ms1, h2, m2, s2, ms2) =>
        `${h1.padStart(2, '0')}:${m1}:${s1}.${ms1.padStart(3, '0')} --> ${h2.padStart(2, '0')}:${m2}:${s2}.${ms2.padStart(3, '0')}`
    );

    vttBlocks.push(`${convertedTime}\n${textLines.join('\n')}`);
  }

  return `WEBVTT\n\n${vttBlocks.join('\n\n')}\n`;
}

export async function fetchSubtitleAsVtt(sub: Anime1VSubtitle): Promise<string | null> {
  if (!sub?.url) return null;
  const isSrt = /\.srt(\?|#|$)/i.test(sub.url) || sub.format === 'srt';
  let targetUrl = sub.url;
  try {
    targetUrl = encodeURI(decodeURI(sub.url));
  } catch (_) {}

  // 1. Intento directo desde CDN
  try {
    const res = await fetch(targetUrl);
    if (res.ok) {
      const rawText = await res.text();
      return isSrt ? srtToVtt(rawText) : rawText;
    }
  } catch (_e) {}

  // 2. Respaldo a través del proxy de subtítulos del backend
  try {
    const proxyUrl = buildSubtitlesProxyUrl(targetUrl);
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const rawText = await res.text();
      return isSrt ? srtToVtt(rawText) : rawText;
    }
  } catch (_e) {}

  return null;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export function parseTimestampToSeconds(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    return (parseFloat(parts[0]) || 0) * 3600 + (parseFloat(parts[1]) || 0) * 60 + (parseFloat(parts[2]) || 0);
  } else if (parts.length === 2) {
    return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
  }
  return 0;
}

export function parseSubtitles(content: string): SubtitleCue[] {
  if (!content) return [];
  const text = String(content).replace(/^\uFEFF/, '').replace(/\r/g, '');
  const blocks = text.trim().split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines.length) continue;

    const timeIdx = lines.findIndex((l) =>
      /\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}/.test(l)
    );
    if (timeIdx === -1) continue;

    const timeLine = lines[timeIdx];
    const match = timeLine.match(/(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})/);
    if (!match) continue;

    const start = parseTimestampToSeconds(match[1]);
    const end = parseTimestampToSeconds(match[2]);
    const textLines = lines.slice(timeIdx + 1)
      .map((l) => l.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);

    if (textLines.length > 0 && end > start) {
      cues.push({ start, end, text: textLines.join('\n') });
    }
  }

  return cues;
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
  if (lower.startsWith('http')) return true;
  return false;
}

export interface RecentEpisode {
  title: string;
  slug: string;
  url: string;
  image: string;
  episode: number;
  dateLabel: string | null;
  timestamp: string | null;
  malId?: number | null;
  provider: string;
}

export async function fetchRecentEpisodes(): Promise<RecentEpisode[]> {
  try {
    const data = await fetchFromApi<{ results: RecentEpisode[]; count: number }>(
      '/api/v1/anime/recent-episodes',
      {}
    );
    return data?.results || [];
  } catch (error) {
    console.error('Error fetching recent episodes:', error);
    return [];
  }
}

export interface RecentEpisodesByProvider {
  provider: string;
  label: string;
  results: RecentEpisode[];
  count: number;
  updatedAt?: string;
}

/**
 * Feed de episodios recientes de un proveedor individual
 * (`/api/v1/anime/recent-episodes-by-provider`).
 */
export async function fetchRecentEpisodesByProvider(
  provider: string
): Promise<RecentEpisode[]> {
  try {
    const data = await fetchFromApi<RecentEpisodesByProvider>(
      '/api/v1/anime/recent-episodes-by-provider',
      { provider }
    );
    return data?.results || [];
  } catch (error) {
    console.error('Error fetching recent episodes by provider:', error);
    return [];
  }
}

/**
 * Número de animes distintos con episodios recientes de un proveedor
 * (`/api/v1/anime/recent-episodes-count`). Usado para el badge de las etiquetas.
 */
export async function fetchRecentEpisodesCount(provider: string): Promise<number> {
  try {
    const data = await fetchFromApi<{
      provider: string;
      label: string;
      count: number;
    }>('/api/v1/anime/recent-episodes-count', { provider });
    return data?.count ?? 0;
  } catch (error) {
    console.error('Error fetching recent episodes count:', error);
    return 0;
  }
}

export interface LatestEpisode {
  title: string;
  slug: string;
  url: string;
  image: string;
  backdrop?: string;
  episode: number;
  dateLabel: string;
  timestamp: string;
  domain?: string;
  provider: string;
  malId?: number | null;
  playable?: boolean;
}

export async function fetchLatestEpisodes(providerOrAdult: string | boolean = false): Promise<LatestEpisode[]> {
  try {
    const params: Record<string, string> = {};
    if (typeof providerOrAdult === 'string') {
      params.provider = providerOrAdult;
    } else if (providerOrAdult) {
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
