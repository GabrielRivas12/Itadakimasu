import React, { useState, useEffect, useRef, memo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
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

  useEffect(() => {
    let isMounted = true;
    
    // Determine if we are in the "initial state" (no active search/filters)
    const isInitialState = searchQuery === '' && 
                          selectedGenre === 'Todos' && 
                          selectedSeason === 'Todas' && 
                          selectedYear === 'Todos';

    // If we have session results and we are just returning to the initial state, 
    // don't re-fetch.
    if (exploreInitialized && sessionExploreResults.length > 0 && isInitialState) {
      if (results !== sessionExploreResults) {
        setResults(sessionExploreResults);
      }
      setLoading(false);
      return;
    }

    setLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const queryText = searchQuery.trim() !== '' ? searchQuery : null;
        const genreText = selectedGenre !== 'Todos' ? selectedGenre : null;
        const seasonValue = selectedSeason !== 'Todas' ? selectedSeason : null;
        const yearValue = selectedYear !== 'Todos' ? selectedYear : null;
        
        const data = await searchAnime(queryText, genreText, seasonValue, yearValue);
        
        if (isMounted) {
          setResults(data);
          setLoading(false);
          
          // Save to session cache if it was an initial load
          if (isInitialState) {
            sessionExploreResults = data;
            exploreInitialized = true;
          }
        }
      } catch (error) {
        console.error('Error fetching search results:', error);
        if (isMounted) setLoading(false);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery, selectedGenre, selectedSeason, selectedYear]);

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  return (
    <View style={styles.container}>
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

      {loading ? (
        <ExploreLoading />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<ExploreEmpty />}
          renderItem={({ item }) => (
            <AnimeGridCard item={item} onPress={handleAnimePress} />
          )}
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
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
    paddingTop: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
});
