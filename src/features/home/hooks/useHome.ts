import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchTrendingAnime, Anime } from '../../../../services/anilist';
import { 
  getUserList, 
  UserListItem, 
  animeListEvents 
} from '../../../../services/animeList';
import { 
  getCachedTrendingBanner, 
  getCachedTrendingList, 
  cacheTrendingBanner, 
  cacheTrendingList 
} from '../../../../services/cache';

// Module-level cache to persist data across remounts during the session
let sessionTrending: Anime[] = [];
let sessionFeatured: Anime[] = [];
let sessionContinueWatching: UserListItem[] = [];
let homeInitialized = false;

export const useHome = () => {
  const router = useRouter();
  const [trending, setTrending] = useState<Anime[]>(sessionTrending);
  const [continueWatching, setContinueWatching] = useState<UserListItem[]>(sessionContinueWatching);
  const [featured, setFeatured] = useState<Anime[]>(sessionFeatured);
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
          
          const featuredItems = cachedList.slice(0, 5);
          sessionFeatured = featuredItems;
          setFeatured(featuredItems);
          
          setLoading(false);
        }
      }

      // 2. Fetch from network and local list
      const [trendingData, userList] = await Promise.all([
        fetchTrendingAnime(1, 10),
        getUserList(),
      ]);

      if (trendingData.length > 0) {
        sessionTrending = trendingData;
        setTrending(trendingData);
        pageRef.current = 1;
        hasMoreRef.current = trendingData.length >= 10;
        loadingMoreRef.current = false;
        setLoadingMoreState(false);
        
        const featuredItems = trendingData.slice(0, 5);
        sessionFeatured = featuredItems;
        setFeatured(featuredItems);

        // Update AsyncStorage cache
        await cacheTrendingList(trendingData);
        await cacheTrendingBanner(featuredItems[0]);
      }

      // Filter animes "In Process" for Continue Watching
      const inProcessList = userList.filter(item => item.status === 'En Proceso');
      sessionContinueWatching = inProcessList;
      setContinueWatching(inProcessList);

      homeInitialized = true;
    } catch (error) {
      console.error('Error loading AnimeLT home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for updates in the user list to keep Continue Watching in sync
    const handleListUpdate = (updatedList: UserListItem[]) => {
      const inProcessList = updatedList.filter(item => item.status === 'En Proceso');
      sessionContinueWatching = inProcessList;
      setContinueWatching(inProcessList);
    };

    animeListEvents.on('listUpdated', handleListUpdate);
    return () => {
      animeListEvents.off('listUpdated', handleListUpdate);
    };
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
    continueWatching,
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
