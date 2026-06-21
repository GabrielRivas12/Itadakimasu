import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getUserList,
  UserListItem,
  UserListStatus,
  removeAnimeFromList,
  animeListEvents
} from '../../../../services/animeList';
import { getCurrentUser, onAuthStateChangedCallback } from '../../../../services/auth';
import { getPreloadedUserList, getPreloadPromise } from '../../../../services/dataPreloader';

let sessionList: UserListItem[] = [];
let initialized = false;

export const useCollection = () => {
  const router = useRouter();
  const [list, setList] = useState<UserListItem[]>(sessionList);
  const [activeTab, setActiveTab] = useState<UserListStatus>('En Proceso');
  const [dataLoaded, setDataLoaded] = useState(false);
  const user = getCurrentUser();

  const loadList = useCallback(async (force = false) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      // Clear stale data on logout (only if there was data before)
      if (sessionList.length > 0) {
        sessionList = [];
        initialized = false;
        setList([]);
        setDataLoaded(true);
      }
      // If no data and no user (auth not restored yet), don't set dataLoaded
      // Auth listener below will re-fetch when auth restores
      return;
    }

    if (!force && initialized) {
      return;
    }

    // First load: try preloader cache
    if (!initialized) {
      const preloadPromise = getPreloadPromise();
      if (preloadPromise) {
        await preloadPromise;
        const cached = getPreloadedUserList();
        if (cached) {
          sessionList = cached;
          setList(cached);
          initialized = true;
          setDataLoaded(true);
          return;
        }
      }
    }

    // Fetch fresh data (Firestore sync in background via getUserList)
    try {
      const userList = await getUserList();
      sessionList = userList;
      setList(userList);
      initialized = true;
    } catch (e) {
      console.error('Error loading collection list:', e);
    } finally {
      setDataLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadList(true);
    }, [loadList])
  );

  useEffect(() => {
    const handleListUpdate = (updatedList: UserListItem[]) => {
      sessionList = updatedList;
      setList(updatedList);
    };

    const unsubscribeAuth = onAuthStateChangedCallback((authUser) => {
      if (authUser) {
        // Auth restored after page refresh - fetch data
        loadList(true);
      } else {
        // User logged out - clear stale data
        sessionList = [];
        initialized = false;
        setList([]);
        setDataLoaded(true);
      }
    });

    animeListEvents.on('listUpdated', handleListUpdate);
    return () => {
      unsubscribeAuth();
      animeListEvents.off('listUpdated', handleListUpdate);
    };
  }, [loadList]);

  const handleRemove = (animeId: number, title: string) => {
    if (Platform.OS === 'web') {
      const confirmar = window.confirm(`¿Estás seguro de que deseas quitar "${title}" de tu lista personal?`);
      if (confirmar) {
        removeAnimeFromList(animeId).then((updated) => {
          setList(updated);
        });
      }
    } else {
      Alert.alert(
        'Quitar de la lista',
        `¿Estás seguro de que deseas quitar "${title}" de tu lista personal?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Quitar',
            style: 'destructive',
            onPress: async () => {
              const updated = await removeAnimeFromList(animeId);
              setList(updated);
            },
          },
        ]
      );
    }
  };

  const handleAnimePress = (id: number) => {
    router.push({ pathname: '/animedetails', params: { id } });
  };

  const filteredList = list.filter((item) => item.status === activeTab);

  const countInProcess = list.filter((item) => item.status === 'En Proceso').length;
  const countCompleted = list.filter((item) => item.status === 'Terminado').length;
  const countPlanToWatch = list.filter((item) => item.status === 'Por Ver').length;

  return {
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
    loadList,
  };
};
