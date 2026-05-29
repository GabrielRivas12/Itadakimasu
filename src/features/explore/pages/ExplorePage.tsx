import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { searchAnime, Anime } from '../../../../services/anilist';
import { SearchBar } from '../components/SearchBar';
import { GenreFilters } from '../components/GenreFilters';
import { AnimeGridCard } from '../components/AnimeGridCard';

export function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const queryText = searchQuery.trim() !== '' ? searchQuery : null;
        const genreText = selectedGenre !== 'Todos' ? selectedGenre : null;
        
        const data = await searchAnime(queryText, genreText);
        
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
  }, [searchQuery, selectedGenre]);

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
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Buscando contenido...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>No se encontraron resultados</Text>
              <Text style={styles.emptySubtext}>Intenta buscar con otros términos o filtros</Text>
            </View>
          }
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
    paddingTop: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});
