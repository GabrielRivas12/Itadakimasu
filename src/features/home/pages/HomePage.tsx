import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchTrendingAnime, fetchPopularAnime, Anime } from '../../../../services/anilist';
import { FeaturedBanner } from '../components/FeaturedBanner';
import { TrendingGrid } from '../components/TrendingGrid';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { getCachedTrendingBanner, getCachedTrendingList, cacheTrendingBanner, cacheTrendingList } from '../../../../services/cache';

interface ContinueAnime extends Anime {
  mockProgress: number;
  mockEpisode: string;
}

export function HomePage() {
  const router = useRouter();
  const [trending, setTrending] = useState<Anime[]>([]);
  const [popular, setPopular] = useState<ContinueAnime[]>([]);
  const [featured, setFeatured] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [loadingMoreState, setLoadingMoreState] = useState(false);

  const loadData = async () => {
    try {
      // 1. Intentar cargar desde el caché para mostrar algo inmediato
      const cachedList = await getCachedTrendingList();
      const cachedBanner = await getCachedTrendingBanner();
      
      if (cachedList && cachedList.length > 0) {
        setTrending(cachedList);
        pageRef.current = 1;
        hasMoreRef.current = cachedList.length >= 10;
        
        if (cachedBanner) {
          setFeatured(cachedBanner);
        } else {
          setFeatured(cachedList[0]);
        }
        
        // Quitar el skeleton de inmediato ya que tenemos datos para mostrar
        setLoading(false);
      }

      // 2. Si no hay caché o queremos actualizar en segundo plano, llamar a la red
      const [trendingData, popularData] = await Promise.all([
        fetchTrendingAnime(1, 10),
        fetchPopularAnime(1, 10),
      ]);

      if (trendingData.length > 0) {
        setTrending(trendingData);
        pageRef.current = 1;
        hasMoreRef.current = trendingData.length >= 10;
        loadingMoreRef.current = false;
        setLoadingMoreState(false);
        
        const bannerAnime = trendingData[0];
        setFeatured(bannerAnime);

        // Guardar la versión fresca en caché
        await cacheTrendingList(trendingData);
        await cacheTrendingBanner(bannerAnime);
      }

      const popularWithProgress: ContinueAnime[] = popularData.slice(0, 5).map((item, index) => {
        const progressValues = [0.75, 0.4, 0.95, 0.2, 0.6];
        const episodeValues = ['Episodio 4', 'Episodio 21', 'Episodio 2', 'Episodio 8', 'Episodio 12'];
        return {
          ...item,
          mockProgress: progressValues[index % progressValues.length],
          mockEpisode: episodeValues[index % episodeValues.length],
        };
      });
      setPopular(popularWithProgress);
    } catch (error) {
      console.error('Error loading AnimeLT home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreData = async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMoreState(true);
    try {
      const nextPage = pageRef.current + 1;
      const trendingData = await fetchTrendingAnime(nextPage, 10);
      if (trendingData.length < 10) hasMoreRef.current = false;
      if (trendingData.length > 0) {
        setTrending((prev) => [...prev, ...trendingData]);
        pageRef.current = nextPage;
      }
    } catch (error) {
      console.error('Error loading more trending anime:', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreState(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [loading]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 150;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (isNearBottom) loadMoreData();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <HomeSkeleton />
        </ScrollView>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
            }
          >
            {featured && (
              <FeaturedBanner featured={featured} onPress={handleAnimePress} />
            )}
            <Text style={styles.sectionTitle}>Tendencias ahora</Text>
            <TrendingGrid trending={trending} onPress={handleAnimePress} />
            {loadingMoreState && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#8b5cf6" />
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
