import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { searchAnime1V, fetchCatalog } from '../../../../services/anime1v';
import { ExploreSpcItem } from '../types/exploreSpc';

const SEARCH_DEBOUNCE_MS = 500;

export const useExploreSpc = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedHentaiTag, setSelectedHentaiTag] = useState('Todos');

  const [results, setResults] = useState<ExploreSpcItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [browseMode, setBrowseMode] = useState(false);

  const query = searchQuery.trim();

  const effectiveGenre = selectedGenre === 'hentai' && selectedHentaiTag !== 'Todos'
    ? selectedHentaiTag
    : selectedGenre;

  useEffect(() => {
    if (selectedGenre !== 'hentai' && selectedHentaiTag !== 'Todos') {
      setSelectedHentaiTag('Todos');
    }
  }, [selectedGenre, selectedHentaiTag]);

  useEffect(() => {
    let cancelled = false;
    const isBrowse = query === '' && selectedGenre !== 'Todos';
    setBrowseMode(isBrowse);
    setLoading(query !== '' || isBrowse);

    const timer = setTimeout(async () => {
      try {
        if (query) {
          // El backend de search no soporta combinar filtros; se busca por texto.
          const data = await searchAnime1V(query, 'animeav1');
          if (!cancelled) {
            setResults(data);
            setHasMore(false);
            setPage(1);
          }
        } else if (selectedGenre !== 'Todos') {
          // Modo catálogo: el backend ya filtra por género de forma server-side.
          const data = await fetchCatalog(1, effectiveGenre);
          if (!cancelled) {
            setResults(data?.results ?? []);
            setHasMore(!!data?.hasMore);
            setPage(1);
          }
        } else {
          // Estado inicial: no se muestra contenido hasta buscar.
          if (!cancelled) {
            setResults([]);
            setHasMore(false);
            setPage(1);
          }
        }
      } catch (error) {
        console.error('Error explorando SenpaiCore:', error);
        if (!cancelled) {
          setResults([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query === '' ? 0 : SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selectedGenre, effectiveGenre]);

  const handleLoadMore = useCallback(async () => {
    if (!browseMode || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchCatalog(nextPage, effectiveGenre);
      if (data && data.results.length > 0) {
        setResults(prev => {
          const existing = new Set(prev.map(a => String(a.id)));
          const unique = data.results.filter(a => !existing.has(String(a.id)));
          return [...prev, ...unique];
        });
        setPage(nextPage);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error cargando más resultados:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [browseMode, loading, loadingMore, hasMore, page, effectiveGenre]);

  const handleAnimePress = useCallback((item: ExploreSpcItem) => {
    router.push({
      pathname: '/animatedetailsepaicore',
      params: { url: item.url, title: item.title },
    });
  }, [router]);

  return {
    searchQuery,
    setSearchQuery,
    selectedGenre,
    setSelectedGenre,
    selectedHentaiTag,
    setSelectedHentaiTag,
    results,
    loading,
    loadingMore,
    hasMore,
    handleLoadMore,
    handleAnimePress,
  };
};