import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { fetchCatalog, searchAnime1V } from '../../../../services/anime1v';
import { ExploreSpcItem } from '../types/exploreSpc';

export const useExploreSpc = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedHentaiTag, setSelectedHentaiTag] = useState('Todos');

  const [results, setResults] = useState<ExploreSpcItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [browseMode, setBrowseMode] = useState(false);

  const query = searchQuery.trim();

  const effectiveGenre =
    selectedGenre === 'hentai' && selectedHentaiTag !== 'Todos'
      ? selectedHentaiTag
      : selectedGenre;

  const isHentai = selectedGenre === 'hentai';
  const hentaiGenre = selectedHentaiTag === 'Todos' ? 'hentai' : selectedHentaiTag;

  const hasActiveBrowse =
    query !== '' || selectedGenre !== 'Todos' || selectedType !== 'Todos';

  useEffect(() => {
    if (selectedGenre !== 'hentai' && selectedHentaiTag !== 'Todos') {
      setSelectedHentaiTag('Todos');
    }
  }, [selectedGenre, selectedHentaiTag]);

  useEffect(() => {
    let cancelled = false;
    const isBrowse = hasActiveBrowse;
    setBrowseMode(isBrowse);

    const timer = setTimeout(async () => {
      try {
        if (isBrowse) {
          if (!cancelled) setLoading(true);
          if (isHentai && query) {
            // Búsqueda hentai por título: /search no pagina y no combina con tags.
            const data = await searchAnime1V(query, 'hentaila');
            if (!cancelled) {
              setResults(data);
              setHasMore(false);
              setPage(1);
            }
          } else if (isHentai) {
            // Navegar hentai por tag/tipo: el catálogo de hentaila filtra server-side.
            const data = await fetchCatalog(1, {
              genre: hentaiGenre,
              type: selectedType === 'Todos' ? undefined : selectedType,
              provider: 'hentaila',
            });
            if (!cancelled) {
              setResults(data?.results ?? []);
              setHasMore(!!data?.hasMore);
              setPage(1);
            }
          } else {
            // Anime normal: catálogo combina búsqueda (q) + filtros server-side.
            const data = await fetchCatalog(1, {
              q: query || undefined,
              genre: effectiveGenre === 'Todos' ? undefined : effectiveGenre,
              type: selectedType === 'Todos' ? undefined : selectedType,
            });
            if (!cancelled) {
              setResults(data?.results ?? []);
              setHasMore(!!data?.hasMore);
              setPage(1);
            }
          }
        } else {
          // Estado inicial: no se muestra contenido hasta buscar o filtrar.
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
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, effectiveGenre, selectedType, hasActiveBrowse, isHentai, hentaiGenre]);

  const handleLoadMore = useCallback(async () => {
    if (!browseMode || loading || loadingMore || !hasMore) return;
    if (isHentai && query) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = isHentai
        ? await fetchCatalog(nextPage, {
            genre: hentaiGenre,
            type: selectedType === 'Todos' ? undefined : selectedType,
            provider: 'hentaila',
          })
        : await fetchCatalog(nextPage, {
            q: query || undefined,
            genre: effectiveGenre === 'Todos' ? undefined : effectiveGenre,
            type: selectedType === 'Todos' ? undefined : selectedType,
          });
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
  }, [browseMode, loading, loadingMore, hasMore, page, query, effectiveGenre, selectedType, isHentai, hentaiGenre]);

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
    selectedType,
    setSelectedType,
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