import {
  fetchTrending,
  fetchCatalog,
  searchAnime1V,
  buildImageProxyUrl,
  TrendingAnime,
  CatalogAnime,
  Anime1VSearchResult,
} from './anime1v';
import { Anime, AnimeSeason } from './types';

export type { CharacterNode, VoiceActor, CharacterEdge, Anime, AnimeSeason } from './types';

function slugToId(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const chr = slug.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

function trendingToAnime(t: TrendingAnime): Anime {
  const image = t.image ? buildImageProxyUrl(t.image) : '';
  return {
    id: typeof t.id === 'number' ? t.id : slugToId(t.slug),
    idMal: t.malId ?? undefined,
    slug: t.slug,
    title: { romaji: t.title, english: t.title, native: '' },
    coverImage: { large: image, medium: image },
    bannerImage: t.backdrop ? buildImageProxyUrl(t.backdrop) : null,
    averageScore: t.score != null ? Math.round(t.score * 10) : null,
    episodes: null,
    genres: t.genres ?? [],
    type: t.type || 'ANIME',
    isAdult: t.provider === 'hentaila',
    seasonYear: t.year ? Number.parseInt(t.year, 10) : undefined,
    status: t.status ?? undefined,
    description: t.description ?? undefined,
  };
}

function catalogToAnime(c: CatalogAnime): Anime {
  const image = c.image ? buildImageProxyUrl(c.image) : '';
  return {
    id: typeof c.id === 'number' ? c.id : Number(c.id) || slugToId(c.slug),
    idMal: c.malId ?? undefined,
    slug: c.slug,
    title: { romaji: c.title, english: c.title, native: '' },
    coverImage: { large: image, medium: image },
    bannerImage: c.backdrop ? buildImageProxyUrl(c.backdrop) : null,
    averageScore: c.score != null ? Math.round(c.score * 10) : null,
    episodes: null,
    genres: [],
    type: c.type || 'ANIME',
    isAdult: c.provider === 'hentaila',
    seasonYear: c.year ? Number.parseInt(c.year, 10) : undefined,
    status: c.status ?? undefined,
  };
}

function searchToAnime(r: Anime1VSearchResult): Anime {
  const image = r.image ? buildImageProxyUrl(r.image) : '';
  return {
    id: slugToId(r.slug),
    slug: r.slug,
    title: { romaji: r.title, english: r.title, native: '' },
    coverImage: { large: image, medium: image },
    bannerImage: r.backdrop ? buildImageProxyUrl(r.backdrop) : null,
    averageScore: null,
    episodes: null,
    genres: [],
    type: String(r.type || 'ANIME'),
    isAdult: false,
  };
}

export async function fetchAnimesByMalIds(malIds: number[], isAdult = false): Promise<Anime[]> {
  return [];
}

export async function fetchAnimesByTitles(
  titles: string[],
  isAdult = false
): Promise<(Anime | null)[]> {
  const results: (Anime | null)[] = [];
  for (const title of titles) {
    if (!title || title.trim().length < 2) {
      results.push(null);
      continue;
    }
    try {
      const matches = await searchAnime1V(title, isAdult ? 'hentaila' : 'animeav1');
      results.push(matches && matches.length > 0 ? searchToAnime(matches[0]) : null);
    } catch {
      results.push(null);
    }
  }
  return results;
}

export async function fetchTrendingAnime(page = 1, perPage = 10): Promise<Anime[]> {
  const list = await fetchTrending(perPage);
  return list.map(trendingToAnime);
}

export function getCurrentSeason(): { season: AnimeSeason; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let season: AnimeSeason;
  if (month >= 1 && month <= 3) season = 'WINTER';
  else if (month >= 4 && month <= 6) season = 'SPRING';
  else if (month >= 7 && month <= 9) season = 'SUMMER';
  else season = 'FALL';

  return { season, year };
}

export async function fetchSeasonalTrendingAnime(page = 1, perPage = 10): Promise<Anime[]> {
  const list = await fetchTrending(perPage);
  return list.map(trendingToAnime);
}

export async function searchAnime(
  search: string | null,
  genre: string | null,
  season: AnimeSeason | null = null,
  year: number | null = null,
  page = 1,
  perPage = 20,
  isAdult: boolean | null = null
): Promise<Anime[]> {
  const provider = isAdult ? 'hentaila' : 'animeav1';

  if (search && search.trim() !== '') {
    const matches = await searchAnime1V(search.trim(), provider);
    return matches.map(searchToAnime);
  }

  if (genre && genre !== 'Todos') {
    const catalog = await fetchCatalog(page, { genre, provider });
    return (catalog?.results ?? []).map(catalogToAnime);
  }

  const catalog = await fetchCatalog(page, { provider });
  return (catalog?.results ?? []).map(catalogToAnime);
}

export async function fetchAnimeDetails(id: number): Promise<Anime | null> {
  return null;
}

export async function searchAnimeByTitle(title: string, isAdult: boolean = false): Promise<Anime | null> {
  const matches = await searchAnime1V(title, isAdult ? 'hentaila' : 'animeav1');
  return matches && matches.length > 0 ? searchToAnime(matches[0]) : null;
}

export async function fetchAiringAnime(page = 1, perPage = 20, isAdult = false): Promise<Anime[]> {
  const catalog = await fetchCatalog(page, { type: 'tv-anime', provider: isAdult ? 'hentaila' : 'animeav1' });
  return (catalog?.results ?? []).map(catalogToAnime);
}

export async function fetchPopularAnime(page = 1, perPage = 10): Promise<Anime[]> {
  const catalog = await fetchCatalog(page, { type: 'tv-anime', sort: 'popular' });
  return (catalog?.results ?? []).map(catalogToAnime);
}