import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { searchAnime, Anime, AnimeSeason } from '../../../../services/anilist';
import { getIsAdultContentEnabled } from '../../../../services/cache';

// Persistencia de resultados
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

  // Paginacion estados
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const loadSetting = async () => {
      const enabled = await getIsAdultContentEnabled();
      setIsAdultSettingEnabled(enabled);

      // si el setting ha cambiado, reiniciamos la exploracion
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

      // Si contenido adulto está deshabilitado, filtrarlo explícitamente (isAdult: false)
      // Si está habilitado, mostramos ambos (isAdult: null)
      const isAdultFilter = adultSetting ? null : false;

      const data = await searchAnime(queryText, genreText, seasonValue, yearValue, pageNum, 20, isAdultFilter);

      if (data) {
        if (isInitial) {
          setResults(data);
          // Determina si estamos en el estado inicial para almacenar los resultados en sesión
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
      // Si estamos en el estado inicial y ya tenemos resultados en sesión, los usamos en lugar de hacer una nueva consulta
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
