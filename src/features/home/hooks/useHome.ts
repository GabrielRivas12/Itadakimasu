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

// Persistencia en sesión para evitar cargas innesarias 
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

  //  En web, se resuelve la autenticacion
  const isWaitingAuth = useRef(Platform.OS === 'web' && !homeInitialized);

  const loadData = async (forceRefresh = false) => {
    // Si no se fuerza el refresh y ya tenemos datos en sesión, no hacemos nada
    if (!forceRefresh && homeInitialized && sessionTrending.length > 0) {
      setLoading(false);
      return;
    }

    try {
      // 1. Initial Cache (AsyncStorage)
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

          setLoading(false);
        }
      }

      // 2. Para web, si estamos esperando autenticación, no hacemos fetch del listado de usuario
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

      // Actualiza el listado de "Watching" en web solo si no estamos esperando autenticación, para evitar fetch innecesarios
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
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Actualizaciones en tiempo real del listado de usuario, solo en web para evitar fetch innecesarios en mobile
    const handleListUpdate = (updatedList: UserListItem[]) => {
      const inProcessList = updatedList.filter(item => item.status === 'En Proceso');
      sessionContinueWatching = inProcessList;
      setContinueWatching(inProcessList);
      cacheContinueWatching(inProcessList);
    };

    // Autenticación en web, para evitar fetch innecesarios del listado de usuario
    const unsubscribeAuth = onAuthStateChangedCallback(async (user) => {
      //console.log(`[useHome] Auth state changed. User: ${user ? 'Logged In' : 'Guest'}`);

      // Limpiar datos de sesión si el usuario se desloguea
      isWaitingAuth.current = false;

      // Lista de usuario solo se actualiza en web, para evitar fetch innecesarios en mobile
      try {
        const userList = await getUserList();
        const inProcessList = userList.filter(item => item.status === 'En Proceso');

        sessionContinueWatching = inProcessList;
        setContinueWatching(inProcessList);
        await cacheContinueWatching(inProcessList);
      } catch (e) {
        console.warn('[useHome] Error fetching user list after auth change:', e);
      }
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

  const fetchPage = async (page: number): Promise<Anime[]> => {
    const data = await fetchTrendingAnime(page, 10);
    if (data.length < 10) hasMoreRef.current = false;
    return data;
  };

  const loadMoreTrending = async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;

    try {
      const nextPage = pageRef.current + 1;
      const newData = await fetchPage(nextPage);

      if (newData.length > 0) {
        setTrending((prev) => {
          const existingIds = new Set(prev.map(a => a.id));
          const unique = newData.filter(a => !existingIds.has(a.id));
          if (unique.length === 0) return prev;
          return [...prev, ...unique];
        });
        pageRef.current = nextPage;

        if (hasMoreRef.current) {
          fetchPage(nextPage + 1).then((prefetched) => {
            if (prefetched.length > 0) {
              setTrending((prev) => {
                const existingIds = new Set(prev.map(a => a.id));
                const unique = prefetched.filter(a => !existingIds.has(a.id));
                if (unique.length === 0) return prev;
                return [...prev, ...unique];
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading more trending:', error);
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
    router.push({ pathname: '/animedetails', params: { id } });
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
    loadMoreTrending,
  };
};
