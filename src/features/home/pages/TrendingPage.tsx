import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchTrendingAnime, Anime } from '../../../../services/anilist';
import { useResponsive } from '../../../hooks/useResponsive';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';

export function TrendingPage() {
  usePortraitOrientation();
  const router = useRouter();
  const { getColumns, isWeb, getContentWidth, isMobile } = useResponsive();
  const columns = getColumns(2, 3, 4, 6);

  const [list, setList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  const loadPage = useCallback(async (page: number) => {
    const data = await fetchTrendingAnime(page, 10);
    if (data.length < 10) hasMoreRef.current = false;
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadPage(1);
        setList(data);
        pageRef.current = 1;
      } catch (e) {
        console.error('Error loading trending page:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPage]);

  const handleLoadMore = async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const data = await loadPage(nextPage);
      if (data.length > 0) {
        setList((prev) => {
          const existingIds = new Set(prev.map(a => a.id));
          const unique = data.filter(a => !existingIds.has(a.id));
          return [...prev, ...unique];
        });
        pageRef.current = nextPage;
      }
    } catch (e) {
      console.error('Error loading more trending:', e);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const handleAnimePress = (id: number) => {
    router.push({ pathname: '/animedetails', params: { id } });
  };

  const renderItem = useCallback(({ item }: { item: Anime }) => (
    <TouchableOpacity
      style={[styles.card, { width: `${100 / columns - 2}%` }]}
      onPress={() => handleAnimePress(item.id)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.coverImage.large }} style={styles.cardImage} />
      {item.averageScore && (
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {(item.averageScore / 10).toFixed(1)}</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title.romaji || item.title.english}
        </Text>
        <Text style={styles.cardEpisodeInfo}>
          {item.episodes ? `${item.episodes} episodios` : 'En emisión'}
        </Text>
      </View>
    </TouchableOpacity>
  ), [handleAnimePress, columns]);

  return (
    <View style={styles.container}>
      <View style={[
        styles.header,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
      ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Tendencias</Text>
            <Text style={styles.headerSubtitle}>Animes populares del momento</Text>
          </View>
        </View>
      </View>

      <View style={[
        styles.listWrapper,
        isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' }
      ]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            numColumns={columns}
            key={`trending-${columns}`}
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={!isWeb}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                </View>
              ) : null
            }
            columnWrapperStyle={styles.columnWrapper}
          />
        )}
      </View>
    </View>
  );
}

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  card: {
    marginHorizontal: '1%',
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardEpisodeInfo: {
    color: '#94a3b8',
    fontSize: 12,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
});
