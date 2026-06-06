import { useState, useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchTrendingAnime, Anime } from '../../../../services/anilist';
import { 
  getUserList, 
  UserListItem, 
  animeListEvents 
} from '../../../../services/animeList';
import { onAuthStateChangedCallback } from '../../../../services/auth';
import { 
  getCachedTrendingBanner, 
  getCachedTrendingList, 
  getCachedContinueWatching,
  cacheTrendingBanner, 
  cacheTrendingList,
  cacheContinueWatching
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
  
  // Track if we are waiting for the initial auth resolution on web (Only for data fetching, not for UI blocking)
  const isWaitingAuth = useRef(Platform.OS === 'web' && !homeInitialized);

  const loadData = async (forceRefresh = false) => {
    // If we already have data and it's not a forced refresh, don't do anything
    if (!forceRefresh && homeInitialized && sessionTrending.length > 0) {
      setLoading(false);
      return;
    }

    try {
      // 1. Initial Cache Load (AsyncStorage)
      if (!forceRefresh && !homeInitialized && sessionTrending.length === 0) {
        const [cachedList, cachedBanner, cachedContinue] = await Promise.all([
          getCachedTrendingList(),
          getCachedTrendingBanner(),
          getCachedContinueWatching()
        ]);
        
        if (cachedList && cachedList.length > 0) {
          sessionTrending = cachedList;
          setTrending(cachedList);
          
          const featuredItems = cachedList.slice(0, 5);
          sessionFeatured = featuredItems;
          setFeatured(featuredItems);
          
          // Show cached content immediately on all platforms to be fast
          setLoading(false);
        }
      }

      // 2. Network Fetch (Trending and User List)
      // On web, we don't wait for auth to show trending.
      const fetchPromises: [Promise<Anime[]>, Promise<UserListItem[]>] = [
        fetchTrendingAnime(1, 10),
        (Platform.OS === 'web' && isWaitingAuth.current) ? Promise.resolve([]) : getUserList()
      ];

      const [trendingData, userList] = await Promise.all(fetchPromises);

      if (trendingData.length > 0) {
        sessionTrending = trendingData;
        setTrending(trendingData);
        pageRef.current = 1;
        hasMoreRef.current = trendingData.length >= 10;
        
        const featuredItems = trendingData.slice(0, 5);
        sessionFeatured = featuredItems;
        setFeatured(featuredItems);

        await cacheTrendingList(trendingData);
        await cacheTrendingBanner(featuredItems[0]);
      }

      // Update Continue Watching if we fetched a real list
      if (!(Platform.OS === 'web' && isWaitingAuth.current)) {
        const inProcessList = userList.filter(item => item.status === 'En Proceso');
        sessionContinueWatching = inProcessList;
        setContinueWatching(inProcessList);
        await cacheContinueWatching(inProcessList);
      }

      if (trendingData.length > 0 || sessionTrending.length > 0) {
        homeInitialized = true;
      }
    } catch (error) {
      console.error('Error loading Home data:', error);
    } finally {
      // Always hide loading on finish, regardless of auth
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Event listener for global list updates
    const handleListUpdate = (updatedList: UserListItem[]) => {
      const inProcessList = updatedList.filter(item => item.status === 'En Proceso');
      sessionContinueWatching = inProcessList;
      setContinueWatching(inProcessList);
      cacheContinueWatching(inProcessList);
    };

    // Firebase Auth Listener (Updates data in background)
    const unsubscribeAuth = onAuthStateChangedCallback(async (user) => {
      console.log(`[useHome] Auth state changed. User: ${user ? 'Logged In' : 'Guest'}`);
      
      // Clear the waiting flag
      isWaitingAuth.current = false;
      
      // Fetch the definitive user list in background
      try {
        const userList = await getUserList();
        const inProcessList = userList.filter(item => item.status === 'En Proceso');
        
        sessionContinueWatching = inProcessList;
        setContinueWatching(inProcessList);
        await cacheContinueWatching(inProcessList);
      } catch (e) {
        console.warn('[useHome] Error fetching user list after auth change:', e);
      }

      // Ensure loading is false if it wasn't already
      setLoading(false);
    });

    animeListEvents.on('listUpdated', handleListUpdate);
    
    return () => {
      animeListEvents.off('listUpdated', handleListUpdate);
      if (unsubscribeAuth) unsubscribeAuth();
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
