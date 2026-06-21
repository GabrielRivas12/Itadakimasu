import React, { memo } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatsCard } from '../components/StatsCard';
import { StatusTabs } from '../components/StatusTabs';
import { LibraryAnimeCard } from '../components/LibraryAnimeCard';
import { CollectionEmptyList } from '../components/CollectionEmptyList';
import { useCollection } from '../hooks/useCollection';
import { useResponsive } from '../../../hooks/useResponsive';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';

export const CollectionPage = memo(function CollectionPage() {
  usePortraitOrientation();
  const router = useRouter();
  const {
    user,
    dataLoaded,
    activeTab,
    setActiveTab,
    filteredList,
    countInProcess,
    countCompleted,
    countPlanToWatch,
    handleRemove,
    handleAnimePress,
  } = useCollection();

  const { isWeb, getContentWidth, getColumns, isMobile } = useResponsive();
  const columns = getColumns(1, 1, 2, 2);
  const contentWidth = isWeb ? getContentWidth() : '100%';

  return (
    <View style={styles.container}>
      <View style={[
        styles.stickyHeader,
        isWeb && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingHorizontal: 16 }
      ]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Colección</Text>
          <Text style={styles.headerSubtitle}>
            {user ? 'Gestiona tu lista personal' : 'Inicia sesión para gestionar tu colección'}
          </Text>
        </View>
      </View>

      <FlatList
        key={columns}
        data={filteredList}
        keyExtractor={(item) => item.anime.id.toString()}
        numColumns={columns}
        contentContainerStyle={[
          styles.listContent,
          isWeb && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
          isWeb && isMobile && { paddingHorizontal: 16 }
        ]}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {!user && (
              <View style={styles.loginPrompt}>
                <Ionicons name="log-in-outline" size={20} color="#94a3b8" />
                <Text style={styles.loginPromptText}>
                  Inicia sesión en tu perfil para guardar animes
                </Text>
              </View>
            )}

            <StatsCard
              inProcess={countInProcess}
              completed={countCompleted}
              planToWatch={countPlanToWatch}
            />

            <StatusTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </View>
        }
        ListEmptyComponent={
          dataLoaded ? (
            <CollectionEmptyList
              activeTab={activeTab}
              onExplorePress={() => router.push('/explore')}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <LibraryAnimeCard
            item={item}
            onPress={handleAnimePress}
            onRemove={handleRemove}
            width={columns > 1 ? `${100 / columns - 1}%` : undefined}
          />
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  stickyHeader: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  header: {
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161b2c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  loginPromptText: {
    color: '#94a3b8',
    fontSize: 13,
    flex: 1,
  },
});
