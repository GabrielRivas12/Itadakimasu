import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { fetchAiringAnime, Anime } from '../../../../services/anilist';

export const useAiring = () => {
  const router = useRouter();
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAdult, setIsAdult] = useState(false);

  const loadAiring = useCallback(async (pageNum: number, isInitial: boolean = false, adultFilter: boolean = isAdult) => {
    try {
      if (isInitial) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const data = await fetchAiringAnime(pageNum, 20, adultFilter);
      
      if (data) {
        if (isInitial) {
          setResults(data);
        } else {
          setResults(prev => [...prev, ...data]);
        }
        
        if (data.length < 20) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading airing anime:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isAdult]);

  useEffect(() => {
    loadAiring(1, true, isAdult);
  }, [isAdult, loadAiring]);

  const toggleAdult = () => {
    setIsAdult(!isAdult);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadAiring(nextPage, false, isAdult);
    }
  };

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  return {
    results,
    loading,
    loadingMore,
    hasMore,
    isAdult,
    toggleAdult,
    handleLoadMore,
    handleAnimePress,
  };
};
