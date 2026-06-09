import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { searchAnime, Anime, AnimeSeason } from '../../../../services/anilist';
import { getIsAdultContentEnabled } from '../../../../services/cache';

// Module-level cache to persist results across remounts during the session
let sessionExploreResults: Anime[] = [];
let exploreInitialized = false;
let currentAdultSetting: boolean | null = null;

export const useExplore = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedSeason, setSelectedSeason] = useState<AnimeSeason | 'Todas'>('Todas');
  const [selectedYear, setSelectedYear] = useState<number | 'Todos'>('Todos');
  const [results, setResults] = useState<Anime[]>(sessionExploreResults);
  const [loading, setLoading] = useState(!exploreInitialized);
  const [isAdultSettingEnabled, setIsAdultSettingEnabled] = useState(false);
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const loadSetting = async () => {
      const enabled = await getIsAdultContentEnabled();
      setIsAdultSettingEnabled(enabled);
      
      // If setting changed since last session cache, clear it
      if (currentAdultSetting !== null && currentAdultSetting !== enabled) {
        sessionExploreResults = [];
        exploreInitialized = false;
        setResults([]);
        fetchData(1, true, enabled);
      }
      currentAdultSetting = enabled;
    };
    loadSetting();
  }, []);

  const fetchData = useCallback(async (pageNum: number, isInitial: boolean = false, adultSetting: boolean = isAdultSettingEnabled) => {
    try {
      if (isInitial) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const queryText = searchQuery.trim() !== '' ? searchQuery : null;
      const genreText = selectedGenre !== 'Todos' ? selectedGenre : null;
      const seasonValue = selectedSeason !== 'Todas' ? selectedSeason : null;
      const yearValue = selectedYear !== 'Todos' ? selectedYear : null;
      
      // If adult content is disabled, explicitly filter it out (isAdult: false)
      // If enabled, we show both (isAdult: null)
      const isAdultFilter = adultSetting ? null : false;

      const data = await searchAnime(queryText, genreText, seasonValue, yearValue, pageNum, 20, isAdultFilter);
      
      if (data) {
        if (isInitial) {
          setResults(data);
          // Determine if we are in the "initial state" (no active search/filters) to cache
          const isInitialState = searchQuery === '' && 
                                selectedGenre === 'Todos' && 
                                selectedSeason === 'Todas' && 
                                selectedYear === 'Todos';
          if (isInitialState) {
            sessionExploreResults = data;
            exploreInitialized = true;
          }
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
      console.error('Error fetching search results:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedGenre, selectedSeason, selectedYear, isAdultSettingEnabled]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // If we have session results and we are just returning to the initial state, 
      // don't re-fetch but initialize correctly.
      const isInitialFilters = searchQuery === '' && 
                            selectedGenre === 'Todos' && 
                            selectedSeason === 'Todas' && 
                            selectedYear === 'Todos';

      if (exploreInitialized && sessionExploreResults.length > 0 && isInitialFilters && page === 1) {
        setResults(sessionExploreResults);
        setLoading(false);
        setHasMore(true);
        return;
      }

      fetchData(1, true);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGenre, selectedSeason, selectedYear, fetchData]);

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, false);
    }
  };

  const handleAnimePress = (id: number) => {
    router.push({ pathname: '/animedetails', params: { id } });
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedGenre,
    setSelectedGenre,
    selectedSeason,
    setSelectedSeason,
    selectedYear,
    setSelectedYear,
    results,
    loading,
    loadingMore,
    handleLoadMore,
    handleAnimePress,
  };
};
