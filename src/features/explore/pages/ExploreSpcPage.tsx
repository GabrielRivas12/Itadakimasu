import React, { memo } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Text } from 'react-native';
import { Stack } from 'expo-router';
import { GenreFilters } from '../components/GenreFilters';
import { CatalogSearchBar } from '../components/CatalogSearchBar';
import { AnimeSpcGridCard } from '../components/AnimeSpcGridCard';
import { ExploreEmpty } from '../components/ExploreStates';
import { ExploreSkeleton } from '../components/ExploreSkeleton';
import { useExploreSpc } from '../hooks/useExploreSpc';
import { useResponsive } from '../../../hooks/useResponsive';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';

export const ExploreSpcPage = memo(function ExploreSpcPage() {
  usePortraitOrientation();
  const {
    searchQuery,
    setSearchQuery,
    selectedProvider,
    setSelectedProvider,
    selectedGenre,
    setSelectedGenre,
    selectedType,
    setSelectedType,
    selectedHentaiTag,
    setSelectedHentaiTag,
    selectedStatus,
    setSelectedStatus,
    selectedYear,
    setSelectedYear,
    results,
    loading,
    loadingMore,
    handleLoadMore,
    handleAnimePress,
  } = useExploreSpc();

  const { getColumns, isWeb, getContentWidth, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);
  // El buscador y la meta de búsqueda se muestran en móvil web y móvil nativo (Android/iOS).
  const isMobileSearch = isMobile && searchQuery.trim() !== '';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: !isWeb || isMobile,
          title: 'Catálogo de Animes',
          headerStyle: {
            backgroundColor: '#0f172a',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.flex}>
        <FlatList
          key={`explore-list-${columns}`}
          data={results}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={columns}
          contentContainerStyle={[
            styles.gridContent,
            isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%', paddingHorizontal: 0 },
            isWeb && isMobile && { paddingHorizontal: 8 }
          ]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {isWeb && !isMobile && (
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Catálogo de Animes</Text>
                  <Text style={styles.headerSubtitle}>Filtra y descubre nuevos animes</Text>
                </View>
              )}
              {isMobile && (
                <CatalogSearchBar
                  query={searchQuery}
                  onChangeQuery={setSearchQuery}
                  provider={selectedProvider}
                  onSelectProvider={setSelectedProvider}
                />
              )}
              <GenreFilters
                selectedGenre={selectedGenre}
                onSelectGenre={setSelectedGenre}
                selectedType={selectedType}
                onSelectType={setSelectedType}
                selectedStatus={selectedStatus}
                onSelectStatus={setSelectedStatus}
                selectedYear={selectedYear}
                onSelectYear={setSelectedYear}
                selectedHentaiTag={selectedHentaiTag}
                onSelectHentaiTag={setSelectedHentaiTag}
              />
            </View>
          }
          ListEmptyComponent={loading ? <ExploreSkeleton /> : <ExploreEmpty />}
          renderItem={({ item }) => (
            <AnimeSpcGridCard
              item={item}
              onPress={handleAnimePress}
              width={`${100 / columns - 2}%`}
              showSearchMeta={isMobileSearch}
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
    paddingHorizontal: '1%',
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