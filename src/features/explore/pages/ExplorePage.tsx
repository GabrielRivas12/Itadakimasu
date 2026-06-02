import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SearchBar } from '../components/SearchBar';
import { GenreFilters } from '../components/GenreFilters';
import { AnimeGridCard } from '../components/AnimeGridCard';
import { ExploreLoading, ExploreEmpty } from '../components/ExploreStates';
import { useExplore } from '../hooks/useExplore';

export const ExplorePage = memo(function ExplorePage() {
  const {
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
  } = useExplore();

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
