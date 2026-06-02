import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchTrendingAnime, fetchPopularAnime, Anime } from '../../../../services/anilist';
import { 
  getCachedTrendingBanner, 
  getCachedTrendingList, 
  cacheTrendingBanner, 
  cacheTrendingList 
} from '../../../../services/cache';
import { ContinueAnime } from '../types/home';

// Module-level cache to persist data across remounts during the session
let sessionTrending: Anime[] = [];
let sessionPopular: ContinueAnime[] = [];
let sessionFeatured: Anime | null = null;
let homeInitialized = false;

export const useHome = () => {
  const router = useRouter();
  const [trending, setTrending] = useState<Anime[]>(sessionTrending);
  const [popular, setPopular] = useState<ContinueAnime[]>(sessionPopular);
  const [featured, setFeatured] = useState<Anime | null>(sessionFeatured);
  const [loading, setLoading] = useState(!homeInitialized);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMoreState, setLoadingMoreState] = useState(false);

  const fadeAnim = useRef(new Animated.Value(homeInitialized ? 1 : 0)).current;

  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadData = async (forceRefresh = false) => {
    // If we already have data and it's not a forced refresh, don't do anything
    if (!forceRefresh && homeInitialized && sessionTrending.length > 0) {
      setLoading(false);
      return;
    }

    try {
      // 1. Load from AsyncStorage cache only if not initialized and no session data
      if (!forceRefresh && !homeInitialized && sessionTrending.length === 0) {
        const cachedList = await getCachedTrendingList();
        const cachedBanner = await getCachedTrendingBanner();
        
        if (cachedList && cachedList.length > 0) {
          sessionTrending = cachedList;
          setTrending(cachedList);
          pageRef.current = 1;
          hasMoreRef.current = cachedList.length >= 10;
          
          const banner = cachedBanner || cachedList[0];
          sessionFeatured = banner;
          setFeatured(banner);
          
          setLoading(false);
        }
      }

      // 2. Fetch from network if forced or not initialized
      const [trendingData, popularData] = await Promise.all([
        fetchTrendingAnime(1, 10),
        fetchPopularAnime(1, 10),
      ]);

      if (trendingData.length > 0) {
        sessionTrending = trendingData;
        setTrending(trendingData);
        pageRef.current = 1;
        hasMoreRef.current = trendingData.length >= 10;
        loadingMoreRef.current = false;
        setLoadingMoreState(false);
        
        const bannerAnime = trendingData[0];
        sessionFeatured = bannerAnime;
        setFeatured(bannerAnime);

        // Update AsyncStorage cache
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
      
      sessionPopular = popularWithProgress;
      setPopular(popularWithProgress);
      
      homeInitialized = true;
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
    loadData(true);
  };

  const handleAnimePress = (id: number) => {
    router.push(`/anime/${id}`);
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 150;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (isNearBottom) loadMoreData();
  };

  return {
    trending,
    popular,
    featured,
    loading,
    refreshing,
    loadingMoreState,
    fadeAnim,
    onRefresh,
    handleAnimePress,
    handleScroll,
  };
};
