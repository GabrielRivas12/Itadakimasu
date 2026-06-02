import React, { useState, useEffect, useRef, memo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { searchAnime, Anime, AnimeSeason } from '../../../../services/anilist';
import { SearchBar } from '../components/SearchBar';
import { GenreFilters } from '../components/GenreFilters';
import { AnimeGridCard } from '../components/AnimeGridCard';
import { ExploreLoading, ExploreEmpty } from '../components/ExploreStates';

// Module-level cache to persist results across remounts during the session
let sessionExploreResults: Anime[] = [];
let exploreInitialized = false;

export const ExplorePage = memo(function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedSeason, setSelectedSeason] = useState<AnimeSeason | 'Todas'>('Todas');
  const [selectedYear, setSelectedYear] = useState<number | 'Todos'>('Todos');
  const [results, setResults] = useState<Anime[]>(sessionExploreResults);
  const [loading, setLoading] = useState(!exploreInitialized);
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = async (pageNum: number, isInitial: boolean = false) => {
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
      
      const data = await searchAnime(queryText, genreText, seasonValue, yearValue, pageNum);
      
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
        
        // If we got fewer results than perPage (default 20), there's no more
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
  };

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
        setHasMore(true); // Assuming cached data might have more
        return;
      }

      fetchData(1, true);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGenre, selectedSeason, selectedYear]);

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, false);
    }
  };

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar</Text>
        <Text style={styles.headerSubtitle}>Busca tus animes favoritos</Text>
      </View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />
      
      <GenreFilters
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        selectedSeason={selectedSeason}
        onSelectSeason={setSelectedSeason}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
      />

      {loading && results.length === 0 ? (
        <ExploreLoading />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!loading ? <ExploreEmpty /> : null}
          renderItem={({ item }) => (
            <AnimeGridCard item={item} onPress={handleAnimePress} />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#8b5cf6" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
    paddingTop: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
