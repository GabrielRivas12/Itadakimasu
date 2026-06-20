import React, { memo } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Text } from 'react-native';
import { SearchBar } from '../components/SearchBar';
import { GenreFilters } from '../components/GenreFilters';
import { AnimeGridCard } from '../components/AnimeGridCard';
import { ExploreEmpty } from '../components/ExploreStates';
import { ExploreSkeleton } from '../components/ExploreSkeleton';
import { useExplore } from '../hooks/useExplore';
import { ResponsiveContainer } from '../../../components/common/ResponsiveContainer';
import { useResponsive } from '../../../hooks/useResponsive';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';

export const ExplorePage = memo(function ExplorePage() {
  usePortraitOrientation();
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

  const { getColumns, isWeb, getContentWidth, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  return (
    <View style={styles.container}>
      <View style={[
        styles.header, 
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
      ]}>
        <Text style={styles.headerTitle}>Explorar</Text>
        <Text style={styles.headerSubtitle}>Busca tus animes favoritos</Text>
      </View>
      
      <View style={[
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingHorizontal: 16 }
      ]}>
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
      </View>

      {loading && results.length === 0 ? (
        <View style={[
          styles.flex,
          isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        ]}>
          <ExploreSkeleton />
        </View>
      ) : (
        <View style={styles.flex}>
          <FlatList
            key={columns} // Force re-render when columns change
            data={results}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            numColumns={columns}
            contentContainerStyle={[
              styles.gridContent,
              isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
              isWeb && isMobile && { paddingHorizontal: 8 }
            ]}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={!loading ? <ExploreEmpty /> : null}
            renderItem={({ item }) => (
              <AnimeGridCard 
                item={item} 
                onPress={handleAnimePress} 
                width={`${100 / columns - 2}%`}
              />
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
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  flex: {
    flex: 1,
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
    justifyContent: 'flex-start',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
