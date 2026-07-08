import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { fetchLatestEpisodes, LatestEpisode } from '../../../../services/anime1v';
import { fetchAnimesByMalIds, Anime } from '../../../../services/anilist';
import { getIsAdultContentEnabled } from '../../../../services/cache';
import { AnimeWithEpisode } from '../types/airing';

const PAGE_SIZE = 10;

function makeFallbackAnime(ep: LatestEpisode, idx: number): Anime {
  const imageUrl = ep.image || 'https://via.placeholder.com/300x450/1e293b/64748b?text=No+Image';
  return {
    id: -(idx + 1),
    title: { romaji: ep.title, english: null, native: '' },
    coverImage: { large: imageUrl, medium: imageUrl },
    bannerImage: null,
    averageScore: null,
    episodes: null,
    genres: [],
    type: 'ANIME',
  };
}

export const useAiring = () => {
  const router = useRouter();
  const [allResults, setAllResults] = useState<AnimeWithEpisode[]>([]);
  const [results, setResults] = useState<AnimeWithEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAdult, setIsAdult] = useState(false);
  const [isAdultSettingEnabled, setIsAdultSettingEnabled] = useState(false);

  useEffect(() => {
    const loadSetting = async () => {
      const enabled = await getIsAdultContentEnabled();
      setIsAdultSettingEnabled(enabled);
      if (!enabled) {
        setIsAdult(false);
      }
    };
    loadSetting();
  }, []);

  const loadAiring = useCallback(async (adult: boolean) => {
    try {
      setLoading(true);
      setPage(1);
      setHasMore(true);

      const episodes = await fetchLatestEpisodes(adult);

      const latestBySlug = new Map<string, LatestEpisode>();
      for (const ep of episodes) {
        const existing = latestBySlug.get(ep.slug);
        if (!existing || ep.episode > existing.episode) {
          latestBySlug.set(ep.slug, ep);
        }
      }
      const uniqueEpisodes = Array.from(latestBySlug.values());

      const malIds = uniqueEpisodes
        .map(ep => ep.malId)
        .filter((id): id is number => id !== null && id !== undefined);

      const anilistAnime = malIds.length > 0 ? await fetchAnimesByMalIds(malIds, adult) : [];
      const malIdToAnime = new Map<number, Anime>();
      for (const a of anilistAnime) {
        if (a.idMal) malIdToAnime.set(a.idMal, a);
      }

      const resultsArr: AnimeWithEpisode[] = [];
      const seenIds = new Set<number>();

      for (let i = 0; i < uniqueEpisodes.length; i++) {
        const ep = uniqueEpisodes[i];
        let anime: Anime | null = null;

        if (ep.malId) {
          anime = malIdToAnime.get(ep.malId) || null;
        }

        if (!anime) {
          anime = makeFallbackAnime(ep, i);
        }

        if (anime.id < 0 || !seenIds.has(anime.id)) {
          if (anime.id >= 0) seenIds.add(anime.id);
          resultsArr.push({
            anime,
            episode: ep.episode,
            dateLabel: adult ? '' : ep.dateLabel,
            slug: ep.slug,
            timestamp: ep.timestamp,
          });
        }
      }

      setAllResults(resultsArr);
      setResults(resultsArr.slice(0, PAGE_SIZE));
      setHasMore(resultsArr.length > PAGE_SIZE);
    } catch (error) {
      console.error('Error loading latest episodes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAiring(isAdult && isAdultSettingEnabled);
  }, [isAdult, isAdultSettingEnabled, loadAiring]);

  useEffect(() => {
    setLoadingMore(false);
  }, [results]);

  const toggleAdult = () => {
    if (isAdultSettingEnabled) {
      setIsAdult(prev => !prev);
    }
  };

  const handleLoadMore = () => {
    if (!loading && results.length < allResults.length) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      const sliced = allResults.slice(0, nextPage * PAGE_SIZE);
      setResults(sliced);
      setHasMore(allResults.length > sliced.length);
    }
  };

  const handleAnimePress = (id: number) => {
    if (id < 0) return;
    router.push({ pathname: '/animedetails', params: { id } });
  };

  return {
    results,
    loading,
    loadingMore,
    hasMore,
    isAdult,
    isAdultSettingEnabled,
    toggleAdult,
    handleLoadMore,
    handleAnimePress,
  };
};
