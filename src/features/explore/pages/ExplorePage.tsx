import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { searchAnime, Anime, AnimeSeason } from '../../../../services/anilist';
import { SearchBar } from '../components/SearchBar';
import { GenreFilters } from '../components/GenreFilters';
import { AnimeGridCard } from '../components/AnimeGridCard';
import { ExploreLoading, ExploreEmpty } from '../components/ExploreStates';

export function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedSeason, setSelectedSeason] = useState<AnimeSeason | 'Todas'>('Todas');
  const [selectedYear, setSelectedYear] = useState<number | 'Todos'>('Todos');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
    </SafeAreaView>
  );
}

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
