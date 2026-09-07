import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  Animated,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { preloadAllData } from '../../../../services/dataPreloader';
import { FeaturedBanner } from '../components/FeaturedBanner';
import { ContinueWatching } from '../components/ContinueWatching';
import { TrendingGrid } from '../components/TrendingGrid';
import { TrendingSeason } from '../components/TrendingSeason';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { TrendingSenpaiCore } from './TrendingSenpaiCore';
import { useHome } from '../hooks/useHome';
import { ResponsiveContainer } from '../../../components/common/ResponsiveContainer';
import { useResponsive } from '../../../hooks/useResponsive';
import { fetchSeasonalTrendingAnime, Anime } from '../../../../services/anilist';
import { fetchTrending, TrendingAnime } from '../../../../services/anime1v';
import { getCachedSeasonalList, cacheSeasonalList, setIsNotificationsEnabled, getApiSource } from '../../../../services/cache';
import { DownloadApkButton } from '../components/DownloadApkButton';
import { UpdateNotification } from '../components/UpdateNotification/UpdateNotification';
import { StreakBadge } from '../components/StreakBadge';
import { usePortraitOrientation } from '../../../hooks/usePortraitOrientation';
import { inicializarNotificaciones } from '../../../../services/notification';

export function HomePage() {
  usePortraitOrientation();
  const [apiSource, setApiSource] = useState<'anilist' | 'senpaicore'>('anilist');
  const {
    trending,
    continueWatching,
    featured,
    loading,
    refreshing,
    loadingMoreState,
    fadeAnim,
    onRefresh,
    handleAnimePress,
    loadMoreTrending,
  } = useHome(apiSource);

  const [seasonal, setSeasonal] = useState<Anime[]>([]);
  const seasonalPageRef = useRef(1);
  const seasonalHasMoreRef = useRef(true);
  const seasonalLoadingMoreRef = useRef(false);

  const [trendingPopular, setTrendingPopular] = useState<TrendingAnime[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const source = await getApiSource();
        setApiSource(source);
      })();
    }, [])
  );

  useEffect(() => {
    (async () => {
      if (apiSource === 'senpaicore') return;

      const cached = await getCachedSeasonalList();
      if (cached && cached.length > 0) {
        setSeasonal(cached);
      }

      const fresh = await fetchSeasonalTrendingAnime(1, 10);
      if (fresh.length > 0) {
        setSeasonal(fresh);
        seasonalHasMoreRef.current = fresh.length >= 10;
        await cacheSeasonalList(fresh);
      }
    })();
  }, [apiSource]);

  const loadMoreSeasonal = useCallback(async () => {
    if (seasonalLoadingMoreRef.current || !seasonalHasMoreRef.current) return;
    seasonalLoadingMoreRef.current = true;
    try {
      const nextPage = seasonalPageRef.current + 1;
      const data = await fetchSeasonalTrendingAnime(nextPage, 10);
      if (data.length > 0) {
        setSeasonal((prev) => {
          const existingIds = new Set(prev.map(a => a.id));
          const unique = data.filter(a => !existingIds.has(a.id));
          return [...prev, ...unique];
        });
        seasonalPageRef.current = nextPage;
        if (data.length < 10) seasonalHasMoreRef.current = false;
      }
    } catch (e) {
      console.error('Error loading more seasonal:', e);
    } finally {
      seasonalLoadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (apiSource !== 'senpaicore') return;

      try {
        const data = await fetchTrending(12);
        if (data.length > 0) {
          setTrendingPopular(data);
        }
      } catch (e) {
        console.error('Error loading SenpaiCore trending:', e);
      }
    })();
  }, [apiSource]);

  useEffect(() => { preloadAllData(); }, []);

  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const currentVersion = Constants.expoConfig?.version || '1.0.0';
        const storedVersion = await AsyncStorage.getItem('@app_version');

        if (storedVersion !== currentVersion) {
          if (Platform.OS === 'android' && Platform.Version >= 33) {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
              await inicializarNotificaciones();
              await setIsNotificationsEnabled(true);
            } else {
              await setIsNotificationsEnabled(false);
            }
          } else if (Platform.OS !== 'web') {
            const token = await inicializarNotificaciones();
            await setIsNotificationsEnabled(token !== null);
          }
          await AsyncStorage.setItem('@app_version', currentVersion);
        }
      } catch (e) {
        console.error('Error checking app version:', e);
      }
    };
    checkAppVersion();
  }, []);

  const { isWeb, getContentWidth, isMobile } = useResponsive();
  const router = useRouter();

const isSenpaiCoreMode = !isWeb && apiSource === 'senpaicore';

  const handleTrendingPress = useCallback((item: TrendingAnime) => {
    router.push({
      pathname: '/animatedetailsepaicore',
      params: { url: item.url, title: item.title },
    });
  }, [router]);

  return (
    <View style={styles.container}>
      {isWeb && (
        <View style={[
          styles.header,
          isWeb && { maxWidth: getContentWidth(), alignSelf: 'center', width: '100%' },
          isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
        ]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Inicio</Text>
              <Text style={styles.headerSubtitle}>Bienvenido a Itadakimasu!</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StreakBadge />
              {isWeb && isMobile && <DownloadApkButton />}
            </View>
          </View>
        </View>
      )}
      {loading ? (
        <ResponsiveContainer>
          <HomeSkeleton />
        </ResponsiveContainer>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ResponsiveContainer
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
            }
          >
            {featured && (
              <FeaturedBanner featured={featured} onPress={handleAnimePress} />
            )}
            <ContinueWatching items={continueWatching} onPress={handleAnimePress} />
            <UpdateNotification />
            {isSenpaiCoreMode ? (
              trendingPopular.length === 0 ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                </View>
              ) : (
                <TrendingSenpaiCore trending={trendingPopular} onPress={handleTrendingPress} />
              )
            ) : (
              <>
                {!isWeb && <Text style={styles.sectionTitleSeason}>Tendencias de temporada</Text>}
                <TrendingSeason trending={seasonal} onPress={handleAnimePress} onLoadMore={loadMoreSeasonal} />
                {!isWeb && <Text style={styles.sectionTitle}>Tendencias ahora</Text>}
                <TrendingGrid trending={trending} onPress={handleAnimePress} onLoadMore={loadMoreTrending} />
                {loadingMoreState && (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  </View>
                )}
              </>
            )}
          </ResponsiveContainer>
        </Animated.View>
      )}
    </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: '#0b0f19',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitleSeason: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
